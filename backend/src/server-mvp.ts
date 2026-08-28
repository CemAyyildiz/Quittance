import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestId } from './middleware/request-id';
import { createInvoiceSchema } from './utils/validation';
import invoiceService from './services/invoice-memory.service';
import { generatePaymentQR, generateStellarPaymentQR, buildStellarPaymentUri } from './utils/qrcode';
import stellarService from './services/stellar.service';
import { rateLimitIfEnabled } from './middleware/rate-limit-stub';
import healthDetailRouter from './routes/health-detail';
import { toInvoiceDTO } from './utils/invoice-dto';
import { isDecimalEqual } from './utils/amount-compare';

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

// Get invoice by ID
app.get('/api/invoices/:id', async (req: Request, res: Response) => {
  try {
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

// Verify payment against Horizon (memo + amount + destination)
app.post('/api/invoices/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({
        success: false,
        error: 'Transaction hash is required',
      });
    }

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
        error: 'Invoice has already been paid',
      });
    }

    if (invoice.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Invoice is not pending',
      });
    }

    const txDetails = await stellarService.getTransaction(txHash);
    const transaction = txDetails.transaction;
    const paymentOp = txDetails.operations.find((op: any) => op.type === 'payment');

    if (!paymentOp) {
      return res.status(400).json({
        success: false,
        error: 'No payment operation found in transaction',
      });
    }

    if (transaction.memo !== invoice.memo) {
      return res.status(400).json({
        success: false,
        error: 'Memo mismatch',
      });
    }

    if (paymentOp.to !== invoice.sellerPublicKey) {
      return res.status(400).json({
        success: false,
        error: 'Payment destination mismatch',
      });
    }

    if (!isDecimalEqual(paymentOp.amount, String(invoice.amount))) {
      return res.status(400).json({
        success: false,
        error: 'Amount mismatch',
      });
    }

    const opAsset =
      paymentOp.asset_type === 'native' ? 'XLM' : paymentOp.asset_code;
    if (opAsset !== invoice.assetCode) {
      return res.status(400).json({
        success: false,
        error: 'Asset mismatch',
      });
    }

    const updatedInvoice = await invoiceService.markAsPaid(
      id,
      txHash,
      paymentOp.from
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
      error: error.message || 'Failed to verify payment',
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

// Get stats (scoped to seller)
app.get('/api/invoices/stats', async (req: Request, res: Response) => {
  try {
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

export default app;

