import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestId } from './middleware/request-id';
import { createInvoiceSchema } from './utils/validation';
import invoiceService from './services/invoice-memory.service';
import { generatePaymentQR, generateStellarPaymentQR, buildStellarPaymentUri } from './utils/qrcode';
import stellarService, {
  HorizonUnavailableError,
  UnfundedAccountError,
} from './services/stellar.service';
import { rateLimitIfEnabled } from './middleware/rate-limit-stub';
import healthDetailRouter from './routes/health-detail';
import { toInvoiceDTO, toStatusHistoryDTO } from './utils/invoice-dto';
import { amountsMatch } from './utils/amount-compare';
import { VerifyErrorCode, VerifyErrorMessages } from './utils/verify-errors';
import {
  assertInvoiceSettleable,
  runExpirySweep,
  startExpirySweep,
} from './utils/invoice-expiry';
import {
  isSelfPayment,
  paymentAssetMatchesInvoice,
} from './utils/verify-invoice-payment';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ALLOW_SIMULATE = process.env.ALLOW_SIMULATE === 'true';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting (opt-in — enabled only when RATE_LIMIT_ENABLED=true)
app.use(rateLimitIfEnabled());
app.use(requestId);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Quittance API (MVP)',
    version: '1.0.0',
    status: 'running',
    mode: 'in-memory',
    documentation: '/api/health',
  });
});

// Health detail router (mounted before the simple health check)
app.use('/api', healthDetailRouter);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Quittance API',
    mode: 'MVP - In-Memory Storage (Dynamic Seller)',
    message: 'Each user uses their own wallet for payments',
  });
});

// Create invoice
app.post('/api/invoices', async (req: Request, res: Response) => {
  try {
    const validatedData = createInvoiceSchema.parse(req.body);

    // Check the seller on Horizon BEFORE anything is persisted. A network
    // outage must never leave a partially created invoice behind.
    let readiness;
    try {
      readiness = await stellarService.checkSellerAccountForAsset(
        validatedData.sellerPublicKey,
        validatedData.assetCode ?? 'XLM',
        validatedData.assetIssuer,
      );
    } catch (error) {
      if (error instanceof UnfundedAccountError) {
        return res.status(400).json({
          success: false,
          code: 'SELLER_ACCOUNT_UNFUNDED',
          error: error.message,
        });
      }
      if (error instanceof HorizonUnavailableError) {
        return res.status(503).json({
          success: false,
          code: 'HORIZON_UNAVAILABLE',
          error: error.message,
        });
      }
      throw error;
    }

    if (!readiness.ok && validatedData.acknowledgeNoTrustline !== true) {
      return res.status(409).json({
        success: false,
        code: 'SELLER_TRUSTLINE_WARNING',
        warning: readiness.warning,
        error: readiness.warning,
      });
    }

    const invoice = await invoiceService.createInvoice(validatedData);

    const paymentUrl = `${FRONTEND_URL}/pay/${invoice.id}`;
    const qrCodeDataUrl = await generatePaymentQR(paymentUrl);
    const stellarQrCode = await generateStellarPaymentQR(
      invoice.sellerPublicKey,
      invoice.amount.toString(),
      invoice.assetCode,
      invoice.memo,
      invoice.assetIssuer
    );
    const stellarPaymentUri = buildStellarPaymentUri(
      invoice.sellerPublicKey,
      invoice.amount.toString(),
      invoice.assetCode,
      invoice.memo,
      invoice.assetIssuer
    );

    res.status(201).json({
      success: true,
      data: {
        invoice: toInvoiceDTO(invoice),
        paymentUrl,
        qrCode: qrCodeDataUrl,
        stellarQrCode,
        stellarPaymentUri,
      },
    });
  } catch (error: any) {
    console.error('Create invoice error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create invoice',
    });
  }
});

// Registered before `/api/invoices/:id`: Express matches in registration
// order, so with `:id` first this route was shadowed and every request for
// it returned "Invoice not found".
// Get stats (scoped to seller)
app.get('/api/invoices/stats', async (req: Request, res: Response) => {
  try {
    await runExpirySweep(invoiceService);

    const { sellerPublicKey } = req.query;

    if (!sellerPublicKey) {
      return res.status(400).json({
        success: false,
        error: 'sellerPublicKey query parameter is required',
      });
    }

    const stats = await invoiceService.getInvoiceStats(sellerPublicKey as string);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get statistics',
    });
  }
});

// Get invoice by ID
app.get('/api/invoices/:id', async (req: Request, res: Response) => {
  try {
    // Swept on read as well as on the timer, so a lookup one second after
    // expiry cannot report a stale PENDING while waiting for the next sweep.
    await runExpirySweep(invoiceService);

    const { id } = req.params;
    const invoice = await invoiceService.getInvoiceById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    res.json({
      success: true,
      data: toInvoiceDTO(invoice),
    });
  } catch (error: any) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get invoice',
    });
  }
});

// Get all invoices (scoped by sellerPublicKey when provided)
app.get('/api/invoices', async (req: Request, res: Response) => {
  try {
    await runExpirySweep(invoiceService);

    const { status, limit = 50, offset = 0, sellerPublicKey } = req.query;

    if (!sellerPublicKey) {
      return res.status(400).json({
        success: false,
        error: 'sellerPublicKey query parameter is required',
      });
    }

    const invoices = await invoiceService.getInvoicesBySeller(
      sellerPublicKey as string,
      status as string | undefined,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: invoices.map(toInvoiceDTO),
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: invoices.length,
      },
    });
  } catch (error: any) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get invoices',
    });
  }
});

// Append-only status history. Seller-scoped: the payer's payment page never
// calls this endpoint and the rows deliberately carry no customer email.
app.get('/api/invoices/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sellerPublicKey = req.query.sellerPublicKey as string | undefined;

    if (!sellerPublicKey) {
      return res.status(400).json({
        success: false,
        error: 'sellerPublicKey query parameter is required',
      });
    }

    const invoice = await invoiceService.getInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    if (invoice.sellerPublicKey !== sellerPublicKey) {
      return res.status(403).json({ success: false, error: 'Not the owning seller' });
    }

    const history = await invoiceService.getStatusHistory(id);
    return res.json({ success: true, data: history.map(toStatusHistoryDTO) });
  } catch (error: any) {
    console.error('Get status history error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get status history',
    });
  }
});

// Record a partial payment as its own history event. `verify` still requires
// the full amount; this endpoint is the explicit partial-payment transition.
app.post('/api/invoices/:id/partial-payment', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { txHash } = req.body;
    const invoice = await invoiceService.recordPartialPayment(id, txHash);
    return res.json({ success: true, data: toInvoiceDTO(invoice) });
  } catch (error: any) {
    console.error('Record partial payment error:', error);
    return res.status(400).json({
      success: false,
      error: error.message || 'Failed to record partial payment',
    });
  }
});

// Canonical digest the seller must write on chain. Offered only after payment
// and only to the owning seller; the server never signs anything.
app.get('/api/invoices/:id/proof-digest', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sellerPublicKey = req.query.sellerPublicKey as string | undefined;
    const invoice = await invoiceService.getInvoiceById(id);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    if (!sellerPublicKey || invoice.sellerPublicKey !== sellerPublicKey) {
      return res.status(403).json({ success: false, error: 'Not the owning seller' });
    }
    if (invoice.status !== 'PAID') {
      return res.status(400).json({
        success: false,
        code: AnchorErrorCode.INVOICE_NOT_PAID,
        error: 'Only a paid invoice can be anchored',
      });
    }

    return res.json({
      success: true,
      data: {
        invoiceId: invoice.id,
        digest: computeCanonicalDigest(invoice),
        contractId: getAnchorContractId() ?? null,
      },
    });
  } catch (error: any) {
    console.error('Get proof digest error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to compute digest' });
  }
});

// Validate a proposed digest BEFORE the wallet is asked to sign anything.
// The frontend calls this with the digest it intends to submit on chain.
app.post('/api/invoices/:id/anchor/prepare', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { digest, sellerPublicKey } = req.body;
    const invoice = await invoiceService.getInvoiceById(id);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    if (!sellerPublicKey || invoice.sellerPublicKey !== sellerPublicKey) {
      return res.status(403).json({ success: false, error: 'Not the owning seller' });
    }
    if (invoice.status !== 'PAID') {
      return res.status(400).json({
        success: false,
        code: AnchorErrorCode.INVOICE_NOT_PAID,
        error: 'Only a paid invoice can be anchored',
      });
    }
    if (invoice.anchoringTxHash) {
      return res.status(409).json({
        success: false,
        code: AnchorErrorCode.ALREADY_ANCHORED,
        error: 'Invoice is already anchored',
      });
    }
    if (!canonicalDigestMatches(invoice, digest)) {
      return res.status(400).json({
        success: false,
        code: AnchorErrorCode.DIGEST_MISMATCH,
        error: 'Digest does not match the invoice',
      });
    }

    return res.json({
      success: true,
      data: {
        invoiceId: invoice.id,
        digest,
        contractId: getAnchorContractId() ?? null,
      },
    });
  } catch (error: any) {
    console.error('Prepare anchor error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to prepare anchor' });
  }
});

// Record the hash of the seller-signed transaction that wrote the anchor.
app.post('/api/invoices/:id/anchor', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { digest, txHash, sellerPublicKey } = req.body;

    const invoice = await invoiceService.getInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    if (sellerPublicKey && invoice.sellerPublicKey !== sellerPublicKey) {
      return res.status(403).json({ success: false, error: 'Not the owning seller' });
    }

    const updated = await invoiceService.anchorProof(id, digest, txHash);
    return res.json({ success: true, data: toInvoiceDTO(updated) });
  } catch (error: any) {
    if (error instanceof AnchorError) {
      const status =
        error.code === AnchorErrorCode.ALREADY_ANCHORED
          ? 409
          : error.code === AnchorErrorCode.INVOICE_NOT_FOUND
            ? 404
            : 400;
      return res.status(status).json({
        success: false,
        code: error.code,
        error: error.message,
      });
    }
    console.error('Anchor proof error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to anchor proof' });
  }
});

// Get payment info
app.get('/api/invoices/:id/payment-info', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await invoiceService.getInvoiceById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    const paymentUrl = `${FRONTEND_URL}/pay/${invoice.id}`;
    const qrCodeDataUrl = await generatePaymentQR(paymentUrl);
    const stellarQrCode = await generateStellarPaymentQR(
      invoice.sellerPublicKey,
      invoice.amount.toString(),
      invoice.assetCode,
      invoice.memo,
      invoice.assetIssuer
    );
    const stellarPaymentUri = buildStellarPaymentUri(
      invoice.sellerPublicKey,
      invoice.amount.toString(),
      invoice.assetCode,
      invoice.memo,
      invoice.assetIssuer
    );

    res.json({
      success: true,
      data: {
        paymentUrl,
        qrCode: qrCodeDataUrl,
        stellarQrCode,
        stellarPaymentUri,
        invoice: toInvoiceDTO(invoice),
      },
    });
  } catch (error: any) {
    console.error('Get payment info error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payment info',
    });
  }
});

// Cancel invoice
app.post('/api/invoices/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await invoiceService.cancelInvoice(id);

    res.json({
      success: true,
      data: toInvoiceDTO(invoice),
    });
  } catch (error: any) {
    console.error('Cancel invoice error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel invoice',
    });
  }
});

// Extend invoice expiry once (owning seller only; pending or expired unpaid)
app.post('/api/invoices/:id/extend-expiry', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sellerPublicKey, expiresAt } = req.body ?? {};

    if (!sellerPublicKey || typeof sellerPublicKey !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'SELLER_REQUIRED',
        error: 'sellerPublicKey is required',
      });
    }

    if (!expiresAt) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_EXPIRY',
        error: 'expiresAt is required',
      });
    }

    const invoice = await invoiceService.extendExpiry(id, sellerPublicKey, expiresAt);

    res.json({
      success: true,
      data: toInvoiceDTO(invoice),
    });
  } catch (error: any) {
    console.error('Extend invoice expiry error:', error);
    const status = typeof error.status === 'number' ? error.status : 400;
    res.status(status).json({
      success: false,
      code: error.code,
      error: error.message || 'Failed to extend invoice expiry',
    });
  }
});

// Verify payment against Horizon (memo + amount + destination)
app.post('/api/invoices/:id/verify', async (req: Request, res: Response) => {
  try {
    await runExpirySweep(invoiceService);

    const { id } = req.params;
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.TX_HASH_REQUIRED,
        error: VerifyErrorMessages[VerifyErrorCode.TX_HASH_REQUIRED],
      });
    }

    const invoice = await invoiceService.getInvoiceById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        code: VerifyErrorCode.INVOICE_NOT_FOUND,
        error: VerifyErrorMessages[VerifyErrorCode.INVOICE_NOT_FOUND],
      });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.INVOICE_ALREADY_PAID,
        error: VerifyErrorMessages[VerifyErrorCode.INVOICE_ALREADY_PAID],
      });
    }

    // A hash that already settled another invoice cannot settle this one, no
    // matter that the memo and amount match. Checked after the already-paid
    // guard so retrying this invoice is not reported as a reuse, and before
    // Horizon so a known hash never costs a round trip. The response names the
    // problem only: no other invoice (or its customer email) is returned.
    const invoiceWithSameHash = await invoiceService.getInvoiceByTxHash(txHash);
    if (invoiceWithSameHash && invoiceWithSameHash.id !== invoice.id) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.TX_HASH_ALREADY_USED,
        error: VerifyErrorMessages[VerifyErrorCode.TX_HASH_ALREADY_USED],
      });
    }

    // Expiry is decided before Horizon is contacted: a stale invoice is not
    // settleable no matter what the chain says, and there is no reason to
    // spend a Horizon round trip finding that out.
    const settleable = assertInvoiceSettleable(invoice);
    if (!settleable.ok) {
      return res.status(400).json({
        success: false,
        code: settleable.code,
        error: VerifyErrorMessages[settleable.code],
      });
    }

    const txDetails = await stellarService.getTransaction(txHash);
    const transaction = txDetails.transaction;
    const paymentOp = txDetails.operations.find((op: any) => op.type === 'payment');

    if (!paymentOp) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.NO_PAYMENT_OPERATION,
        error: VerifyErrorMessages[VerifyErrorCode.NO_PAYMENT_OPERATION],
      });
    }

    // A seller can otherwise pay their own invoice and produce a proof that a
    // client paid. The memo and amount match, so this is the only check that
    // catches it. Horizon reports the inner transaction source for a fee-bump,
    // so a fee-bumped self-payment is still rejected.
    const paymentSource = paymentOp.source_account ?? paymentOp.from;
    if (
      isSelfPayment(transaction.source_account, invoice.sellerPublicKey) ||
      isSelfPayment(paymentSource, invoice.sellerPublicKey)
    ) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.SELF_PAYMENT,
        error: VerifyErrorMessages[VerifyErrorCode.SELF_PAYMENT],
      });
    }

    if (transaction.memo !== invoice.memo) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.MEMO_MISMATCH,
        error: VerifyErrorMessages[VerifyErrorCode.MEMO_MISMATCH],
      });
    }

    if (paymentOp.to !== invoice.sellerPublicKey) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.DESTINATION_MISMATCH,
        error: VerifyErrorMessages[VerifyErrorCode.DESTINATION_MISMATCH],
      });
    }

    if (!amountsMatch(paymentOp.amount, invoice.amount)) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.AMOUNT_MISMATCH,
        error: VerifyErrorMessages[VerifyErrorCode.AMOUNT_MISMATCH],
      });
    }

    // A Stellar asset is the pair (code, issuer). Comparing codes alone would
    // let any testnet token called USDC settle a USDC invoice, so the issuer is
    // compared too; the rules live in `paymentAssetMatchesInvoice` so this
    // handler and the pure matcher cannot drift apart.
    const opIsNative = paymentOp.asset_type === 'native';
    const opAsset = opIsNative ? 'XLM' : paymentOp.asset_code;

    if (
      !paymentAssetMatchesInvoice({
        paymentAsset: opAsset,
        invoiceAssetCode: invoice.assetCode,
        paymentAssetIssuer: paymentOp.asset_issuer,
        invoiceAssetIssuer: invoice.assetIssuer,
        paymentIsNative: opIsNative,
      })
    ) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.ASSET_MISMATCH,
        error: VerifyErrorMessages[VerifyErrorCode.ASSET_MISMATCH],
      });
    }

    const updatedInvoice = await invoiceService.markAsPaid(
      id,
      txHash,
      paymentOp.from,
      Number(transaction.ledger ?? 0)
    );

    res.json({
      success: true,
      data: toInvoiceDTO(updatedInvoice),
      message: 'Payment verified on Stellar',
    });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      code: VerifyErrorCode.VERIFY_FAILED,
      error: VerifyErrorMessages[VerifyErrorCode.VERIFY_FAILED],
    });
  }
});

// Simulate payment — only when ALLOW_SIMULATE=true (local testing)
app.post('/api/invoices/:id/simulate-payment', async (req: Request, res: Response) => {
  try {
    if (!ALLOW_SIMULATE) {
      return res.status(404).json({
        success: false,
        error: 'Endpoint not found',
      });
    }

    const { id } = req.params;
    const invoice = await invoiceService.getInvoiceById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        error: 'This invoice has already been paid. Cannot accept duplicate payment.',
      });
    }

    if (invoice.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Invoice is not pending',
      });
    }

    const mockTxHash = `MOCK_TX_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    const mockPayerKey = 'GXXXSIMULATEDPAYERXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

    const updatedInvoice = await invoiceService.markAsPaid(id, mockTxHash, mockPayerKey);

    res.json({
      success: true,
      data: toInvoiceDTO(updatedInvoice),
      message: 'Payment simulated successfully',
    });
  } catch (error: any) {
    console.error('Simulate payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to simulate payment',
    });
  }
});


// Mock Stellar endpoints (MVP için)
app.get('/api/stellar/account', (req: Request, res: Response) => {
  const { publicKey } = req.query;
  res.json({
    success: true,
    data: {
      publicKey: publicKey || 'EXAMPLE',
      balances: [
        { assetCode: 'XLM', balance: '1000.0000000' },
      ],
      sequence: '12345678',
      subentryCount: 0,
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
//
// Listening (and the sweep timer) are skipped under test so the module can be
// imported by supertest without binding a port or leaving a timer running.
if (process.env.NODE_ENV !== 'test') {
  startExpirySweep(invoiceService);

  app.listen(PORT, () => {
    console.log('\n🚀 Quittance Backend (MVP Mode)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 API: http://localhost:${PORT}/api`);
    console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
    console.log(`💾 Storage: In-Memory (No Database)`);
    console.log(`💰 Dynamic Seller: Each user uses their own wallet!`);
    console.log(`🌐 Frontend: ${FRONTEND_URL}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
}

export default app;

