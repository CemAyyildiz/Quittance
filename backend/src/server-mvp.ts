import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestId } from './middleware/request-id';
import { createInvoiceSchema } from './utils/validation';
import invoiceService from './services/invoice-memory.service';
import { generatePaymentQR, generateStellarPaymentQR, buildStellarPaymentUri } from './utils/qrcode';
import stellarService from './services/stellar.service';
import {
  rateLimitIfEnabled,
  sellerCreateRateLimit,
  invoiceVerifyRateLimit,
} from './middleware/rate-limit-stub';
import healthDetailRouter from './routes/health-detail';
import { toInvoiceDTO as mapInvoiceDTO } from './utils/invoice-dto';
import { addDecimalAmounts, compareDecimals, subtractDecimalAmounts } from './utils/amount-compare';
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
import { parsePaginationQuery } from './utils/parse-pagination';
import { isSmtpConfigured, sendEmail, generateInvoiceEmail } from './utils/smtp';
import { STELLAR_NETWORK } from './config/stellar';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ALLOW_SIMULATE = process.env.ALLOW_SIMULATE === 'true';

/** Map invoices through the DTO helper with the configured Stellar network. */
function toInvoiceDTO(
  invoice: Parameters<typeof mapInvoiceDTO>[0],
) {
  return mapInvoiceDTO(invoice, { network: STELLAR_NETWORK });
}

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
    smtp: isSmtpConfigured(),
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
    smtp: isSmtpConfigured(),
  });
});

// Create invoice (per-seller rate limit on by default)
app.post('/api/invoices', sellerCreateRateLimit(), async (req: Request, res: Response) => {
  try {
    const validatedData = createInvoiceSchema.parse(req.body);
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

    const { status, cursor, sellerPublicKey } = req.query;

    if (!sellerPublicKey) {
      return res.status(400).json({
        success: false,
        error: 'sellerPublicKey query parameter is required',
      });
    }

    if (cursor !== undefined && typeof cursor !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'cursor must be a single string value',
      });
    }

    // Reuse the shared parser so a limit above 100 is clamped, not honoured.
    const { limit } = parsePaginationQuery(req.query);

    const result = await invoiceService.getInvoicesBySeller(
      sellerPublicKey as string,
      typeof status === 'string' ? status : undefined,
      limit,
      cursor
    );

    res.json({
      success: true,
      data: result.invoices.map(toInvoiceDTO),
      pagination: {
        limit: result.limit,
        nextCursor: result.nextCursor,
      },
    });
  } catch (error: any) {
    console.error('Get invoices error:', error);
    const statusCode = error?.status === 400 ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get invoices',
    });
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

// Send invoice via email (SMTP). Email is delivery only, not a login.
app.post('/api/invoices/:id/send', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await invoiceService.getInvoiceById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    if (!invoice.customerEmail) {
      return res.status(400).json({
        success: false,
        error: 'Customer email is required',
      });
    }

    if (!isSmtpConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'SMTP is not configured on the server',
      });
    }

    const paymentUrl = `${FRONTEND_URL}/pay/${invoice.id}`;
    const emailContent = generateInvoiceEmail(
      invoice.id,
      invoice.amount,
      invoice.assetCode,
      invoice.memo,
      paymentUrl,
      invoice.customerName
    );
    emailContent.to = invoice.customerEmail;

    await sendEmail(emailContent);

    res.json({
      success: true,
      message: 'Invoice sent successfully',
    });
  } catch (error: any) {
    console.error('Send invoice error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send invoice',
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

// Verify payment against Horizon (memo + amount + destination).
// Per-invoice rate limit is on by default and short-circuits before Horizon.
app.post('/api/invoices/:id/verify', invoiceVerifyRateLimit(), async (req: Request, res: Response) => {
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
    if (invoiceWithSameHash) {
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

    // A payment must carry a ledger sequence; otherwise we would store
    // Number(undefined) and mark the invoice paid without a real anchor.
    const ledgerSequence = Number(transaction?.ledger_sequence);
    if (!Number.isFinite(ledgerSequence) || ledgerSequence <= 0) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.MISSING_LEDGER_SEQUENCE,
        error: VerifyErrorMessages[VerifyErrorCode.MISSING_LEDGER_SEQUENCE],
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

    const receivedAmount = String(invoice.receivedAmount ?? '0');
    const remainingAmount = subtractDecimalAmounts(String(invoice.amount), receivedAmount);
    if (
      compareDecimals(paymentOp.amount, '0') <= 0 ||
      compareDecimals(paymentOp.amount, remainingAmount) > 0
    ) {
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

    // The inner source of a fee-bump is the real payer; `paymentOp.from`
    // alone would store the outer fee-bump account.
    const payerPublicKey = paymentOp.source_account ?? paymentOp.from;

    const nextReceivedAmount = addDecimalAmounts(receivedAmount, paymentOp.amount);
    const isPaid = compareDecimals(nextReceivedAmount, String(invoice.amount)) === 0;
    const updatedInvoice = await invoiceService.recordPayment(
      id,
      {
        txHash,
        amount: paymentOp.amount,
        payerPublicKey,
        ledger: ledgerSequence,
        paidAt: transaction.created_at ? new Date(transaction.created_at) : new Date(),
      },
      nextReceivedAmount,
      isPaid,
    );

    res.json({
      success: true,
      data: toInvoiceDTO(updatedInvoice),
      message: isPaid ? 'Payment verified on Stellar' : 'Partial payment recorded on Stellar',
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

    const updatedInvoice = await invoiceService.markAsPaid(id, mockTxHash, mockPayerKey, 1);

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

