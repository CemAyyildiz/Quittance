import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestId } from './middleware/request-id';
import { createInvoiceSchema } from './utils/validation';
import { getStorage } from './storage/storage-factory';
import { generatePaymentQR, generateStellarPaymentQR, buildStellarPaymentUri } from './utils/qrcode';
import stellarService from './services/stellar.service';
import { rateLimitIfEnabled } from './middleware/rate-limit-stub';
import healthDetailRouter from './routes/health-detail';
import { toInvoiceDTO } from './utils/invoice-dto';
import { isDecimalEqual } from './utils/amount-compare';
import { VerifyErrorCode, VerifyErrorMessages } from './utils/verify-errors';
import {
  assertInvoiceSettleable,
  runExpirySweep,
  startExpirySweep,
} from './utils/invoice-expiry';
import { paymentAssetMatchesInvoice } from './utils/verify-invoice-payment';
import { generateInvoiceMemo } from './utils/memo';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ALLOW_SIMULATE = process.env.ALLOW_SIMULATE === 'true';

// Storage instance (initialized on first request or startup)
let storage: Awaited<ReturnType<typeof getStorage>> | null = null;

// Initialize storage
async function initStorage() {
  if (!storage) {
    storage = await getStorage();
  }
  return storage;
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
    const st = await initStorage();
    const validatedData = createInvoiceSchema.parse(req.body);
    
    if (!validatedData.sellerPublicKey) {
      throw new Error('Seller public key is required');
    }

    const memo = generateInvoiceMemo();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (validatedData.expiresInDays || 7));

    const invoice = await st.createInvoice({
      sellerPublicKey: validatedData.sellerPublicKey,
      amount: validatedData.amount,
      assetCode: validatedData.assetCode || 'XLM',
      assetIssuer: validatedData.assetIssuer,
      memo,
      description: validatedData.description,
      customerName: validatedData.customerName,
      customerEmail: validatedData.customerEmail,
      expiresAt,
    });

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
    const st = await initStorage();
    await st.markExpiredInvoices();

    const { sellerPublicKey } = req.query;

    if (!sellerPublicKey) {
      return res.status(400).json({
        success: false,
        error: 'sellerPublicKey query parameter is required',
      });
    }

    const stats = await st.getStats(sellerPublicKey as string);

    res.json({
      success: true,
      data: [stats],
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
    const st = await initStorage();
    // Swept on read as well as on the timer, so a lookup one second after
    // expiry cannot report a stale PENDING while waiting for the next sweep.
    await st.markExpiredInvoices();

    const { id } = req.params;
    const invoice = await st.getInvoiceById(id);

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
    const st = await initStorage();
    await st.markExpiredInvoices();

    const { status, limit = 50, offset = 0, sellerPublicKey } = req.query;

    if (!sellerPublicKey) {
      return res.status(400).json({
        success: false,
        error: 'sellerPublicKey query parameter is required',
      });
    }

    let invoices = await st.getAllInvoices(status ? { status: status as string } : undefined);
    
    if (sellerPublicKey) {
      invoices = invoices.filter((inv) => inv.sellerPublicKey === sellerPublicKey);
    }

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedInvoices = invoices.slice(offsetNum, offsetNum + limitNum);

    res.json({
      success: true,
      data: paginatedInvoices.map(toInvoiceDTO),
      pagination: {
        limit: limitNum,
        offset: offsetNum,
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

// Get payment info
app.get('/api/invoices/:id/payment-info', async (req: Request, res: Response) => {
  try {
    const st = await initStorage();
    const { id } = req.params;
    const invoice = await st.getInvoiceById(id);

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
    const st = await initStorage();
    const { id } = req.params;
    const invoice = await st.getInvoiceById(id);

    if (!invoice || invoice.status !== 'PENDING') {
      throw new Error('Invoice not found or already processed');
    }

    const updatedInvoice = await st.updateInvoice(id, { status: 'CANCELLED' });

    res.json({
      success: true,
      data: toInvoiceDTO(updatedInvoice!),
    });
  } catch (error: any) {
    console.error('Cancel invoice error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel invoice',
    });
  }
});

// Verify payment against Horizon (memo + amount + destination)
app.post('/api/invoices/:id/verify', async (req: Request, res: Response) => {
  try {
    const st = await initStorage();
    await st.markExpiredInvoices();

    const { id } = req.params;
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.TX_HASH_REQUIRED,
        error: VerifyErrorMessages[VerifyErrorCode.TX_HASH_REQUIRED],
      });
    }

    const invoice = await st.getInvoiceById(id);

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

    if (!isDecimalEqual(paymentOp.amount, String(invoice.amount))) {
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

    const updatedInvoice = await st.markAsPaid(
      id,
      txHash,
      paymentOp.from
    );

    res.json({
      success: true,
      data: toInvoiceDTO(updatedInvoice!),
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

    const st = await initStorage();
    const { id } = req.params;
    const invoice = await st.getInvoiceById(id);

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

    const updatedInvoice = await st.markAsPaid(id, mockTxHash, mockPayerKey);

    res.json({
      success: true,
      data: toInvoiceDTO(updatedInvoice!),
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
  // Initialize storage and start expiry sweep
  initStorage().then(st => {
    // Start expiry sweep timer
    setInterval(async () => {
      try {
        await st.markExpiredInvoices();
      } catch (error) {
        console.error('Expiry sweep error:', error);
      }
    }, 60000); // Run every 60 seconds

    const storageMode = process.env.DATABASE_URL ? 'Postgres' : 'In-Memory (No Database)';
    
    app.listen(PORT, () => {
      console.log('\n🚀 Quittance Backend (MVP Mode)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
      console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
      console.log(`💾 Storage: ${storageMode}`);
      console.log(`💰 Dynamic Seller: Each user uses their own wallet!`);
      console.log(`🌐 Frontend: ${FRONTEND_URL}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
  }).catch(error => {
    console.error('❌ Failed to initialize storage:', error.message);
    process.exit(1);
  });
}

export default app;

