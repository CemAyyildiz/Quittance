import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import { requestId } from './middleware/request-id';
import {
  createInvoiceSchema,
  memoByteLengthSchema,
  stellarPublicKeySchema,
  verifyTxHashSchema,
} from './utils/validation';
import { MemoError } from './utils/memo';
import invoiceService from './services/invoice-memory.service';
import { startMvpPaymentMonitor } from './services/mvp-payment-monitor';
import memoryStorage, { type Invoice } from './storage/memory-storage';
import { generatePaymentQR, generateStellarPaymentQR, buildStellarPaymentUri } from './utils/qrcode';
import stellarService, {
  HorizonUnavailableError,
  UnfundedAccountError,
} from './services/stellar.service';
import {
  rateLimitIfEnabled,
  sellerCreateRateLimit,
  invoiceVerifyRateLimit,
} from './middleware/rate-limit-stub';
import healthDetailRouter from './routes/health-detail';
import {
  toInvoiceDTO as mapInvoiceDTO,
  toStatusHistoryDTO,
} from './utils/invoice-dto';
import {
  addDecimalAmounts,
  amountToStroops,
  compareDecimals,
  isDecimalEqual,
  subtractDecimalAmounts,
} from './utils/amount-compare';
import { memosMatch } from './utils/memo-normalize';
import { VerifyErrorCode, VerifyErrorMessages } from './utils/verify-errors';
import {
  assertInvoiceSettleable,
  runExpirySweep,
  startExpirySweep,
} from './utils/invoice-expiry';
import {
  checkTransactionTimeBounds,
  isSelfPayment,
  paymentDestinationMatchesInvoice,
  paymentAssetMatchesInvoice,
  isFeeBumpTransaction,
  isNestedFeeBump,
  feeBumpWrapsOnlyPayment,
  remainingInvoiceAmount,
} from './utils/verify-invoice-payment';
import { MAX_PAGE_LIMIT, parsePaginationQuery } from './utils/parse-pagination';
import {
  AnchorError,
  AnchorErrorCode,
  canonicalDigestMatches,
  computeCanonicalDigest,
  getAnchorContractId,
} from './utils/canonical-proof';
import { verifyAnchorTransaction } from './utils/anchor-transaction';
import { createInvoiceBackup } from './utils/invoice-backup';
import { isSmtpConfigured, sendEmail, generateInvoiceEmail } from './utils/smtp';
import { STELLAR_NETWORK } from './config/stellar';
import {
  IDEMPOTENCY_KEY_HEADER,
  createOnce,
  parseIdempotencyKey,
} from './utils/idempotency';

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

/** Builds the create-invoice response payload (shared by new creates and replays). */
async function buildCreateInvoiceResponse(invoice: any) {
  const paymentUrl = `${FRONTEND_URL}/pay/${invoice.id}`;
  const qrCodeDataUrl = await generatePaymentQR(paymentUrl);
  const stellarQrCode = await generateStellarPaymentQR(
    invoice.sellerMuxedAddress ?? invoice.sellerPublicKey,
    invoice.amount.toString(),
    invoice.assetCode,
    invoice.memo,
    invoice.assetIssuer
  );
  const stellarPaymentUri = buildStellarPaymentUri(
    invoice.sellerMuxedAddress ?? invoice.sellerPublicKey,
    invoice.amount.toString(),
    invoice.assetCode,
    invoice.memo,
    invoice.assetIssuer
  );

  return {
    invoice: toInvoiceDTO(invoice),
    paymentUrl,
    qrCode: qrCodeDataUrl,
    stellarQrCode,
    stellarPaymentUri,
  };
}

// Create invoice (per-seller rate limit on by default).
// An optional Idempotency-Key header makes a double submit safe: the same
// seller and key return the original invoice instead of minting a new memo.
app.post('/api/invoices', sellerCreateRateLimit(), async (req: Request, res: Response) => {
  try {
    const parsedKey = parseIdempotencyKey(req.get(IDEMPOTENCY_KEY_HEADER));
    if (!parsedKey.ok) {
      return res.status(400).json({
        success: false,
        error: parsedKey.error,
      });
    }

    const validatedData = createInvoiceSchema.parse(req.body);

    let invoice: any;
    let replayed = false;
    if (parsedKey.key) {
      ({ invoice, replayed } = await createOnce(
        validatedData.sellerPublicKey,
        parsedKey.key,
        (invoiceId) => invoiceService.getInvoiceById(invoiceId),
        () => invoiceService.createInvoice(validatedData),
      ));
    } else {
      invoice = await invoiceService.createInvoice(validatedData);
    }

    if (replayed) {
      res.set('Idempotent-Replayed', 'true');
    }

    res.status(201).json({
      success: true,
      data: await buildCreateInvoiceResponse(invoice),
    });
  } catch (error: any) {
    console.error('Create invoice error:', error);
    res.status(error instanceof MemoError ? error.status : 400).json({
      success: false,
      ...(error instanceof MemoError ? { code: error.code } : {}),
      error: error.message || 'Failed to create invoice',
    });
  }
});

const backupDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date');
const backupInvoice = z.object({
  id: z.string().min(1),
  sellerPublicKey: stellarPublicKeySchema,
  sellerName: z.string().optional(),
  sellerMuxedAddress: z.string().optional(),
  amount: z.number().positive().finite(),
  lineItems: z.array(z.object({
    label: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
  })).optional(),
  assetCode: z.string().min(1),
  assetIssuer: z.string().optional(),
  memo: memoByteLengthSchema.min(1),
  description: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'REFUNDED', 'EXPIRED', 'CANCELLED', 'UNCOLLECTIBLE']),
  paymentTxHash: z.string().min(1).optional(),
  payerPublicKey: z.string().optional(),
  ledger: z.number().int().positive().optional(),
  refundTxHash: z.string().min(1).optional(),
  refundedAt: backupDate.optional(),
  refundLedger: z.number().int().positive().optional(),
  anchoringTxHash: z.string().min(1).optional(),
  payments: z.array(z.object({
    txHash: z.string().min(1),
    amount: z.string(),
    payerPublicKey: z.string(),
    ledger: z.number().int().positive(),
    paidAt: backupDate,
  })).optional(),
  receivedAmount: z.string().optional(),
  createdAt: backupDate,
  paidAt: backupDate.optional(),
  expiresAt: backupDate,
  originalExpiresAt: backupDate.optional(),
  expiryExtended: z.boolean().optional(),
}).refine((invoice) => invoice.status !== 'PAID' || !!invoice.paymentTxHash, {
  message: 'Paid invoices require a paymentTxHash',
});

// The request body is the JSON array saved by the dashboard. Validate every
// row and every conflict before writing any row to the in-memory store.
app.post('/api/invoices/import', (req: Request, res: Response) => {
  const seller = stellarPublicKeySchema.safeParse(req.query.sellerPublicKey);
  const parsed = z.array(backupInvoice).safeParse(req.body);
  if (!seller.success || !parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid invoice backup or sellerPublicKey' });
  }

  const rows = parsed.data;
  if (rows.some((row) => row.sellerPublicKey !== seller.data)) {
    return res.status(400).json({ success: false, error: 'Backup contains invoices for another seller' });
  }

  const ids = new Set<string>();
  const memos = new Set<string>();
  const hashes = new Set<string>();
  const skippedIds: string[] = [];
  const newRows: Invoice[] = [];
  for (const row of rows) {
    if (ids.has(row.id)) {
      return res.status(400).json({ success: false, error: 'Backup contains duplicate invoice IDs' });
    }
    ids.add(row.id);

    if (memoryStorage.getInvoiceById(row.id)) {
      skippedIds.push(row.id);
      continue;
    }

    if (memos.has(row.memo) || memoryStorage.getInvoiceByMemo(row.memo)) {
      return res.status(400).json({ success: false, error: 'Backup contains a memo already in use' });
    }
    memos.add(row.memo);
    if (row.paymentTxHash) {
      if (hashes.has(row.paymentTxHash) || memoryStorage.getInvoiceByTxHash(row.paymentTxHash)) {
        return res.status(400).json({ success: false, error: 'Backup contains a payment hash already in use' });
      }
      hashes.add(row.paymentTxHash);
    }
    const expiresAt = new Date(row.expiresAt);
    newRows.push({
      ...row,
      createdAt: new Date(row.createdAt),
      paidAt: row.paidAt ? new Date(row.paidAt) : undefined,
      refundedAt: row.refundedAt ? new Date(row.refundedAt) : undefined,
      expiresAt,
      originalExpiresAt: row.originalExpiresAt ? new Date(row.originalExpiresAt) : expiresAt,
      expiryExtended: row.expiryExtended ?? false,
      payments: row.payments?.map((payment) => ({
        ...payment,
        paidAt: new Date(payment.paidAt),
      })) ?? [],
      receivedAmount: row.receivedAmount ?? '0',
    });
  }

  memoryStorage.importInvoices(newRows);
  res.json({ success: true, data: { imported: newRows.length, skippedIds } });
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

// Register static export routes before `/api/invoices/:id` so their paths are
// not treated as invoice IDs.
app.get('/api/invoices/export', (req: Request, res: Response) => {
  const seller = stellarPublicKeySchema.safeParse(req.query.sellerPublicKey);
  const includeCustomerEmail = req.query.includeCustomerEmail;
  if (
    !seller.success ||
    (includeCustomerEmail !== undefined &&
      includeCustomerEmail !== 'true' &&
      includeCustomerEmail !== 'false')
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid sellerPublicKey or includeCustomerEmail',
    });
  }

  const backup = createInvoiceBackup(
    memoryStorage.getAllInvoices(),
    seller.data,
    includeCustomerEmail === 'true',
  );
  res.set({
    'Content-Disposition': `attachment; filename="quittance-invoices-${new Date()
      .toISOString()
      .slice(0, 10)}.json"`,
    'Cache-Control': 'private, no-store',
  });
  res.json(backup);
});
app.get('/api/invoices/export.csv', handleInvoiceCsvExport);
app.get('/api/invoices/csv', handleInvoiceCsvExport);

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

    const {
      status,
      assetCode,
      createdFrom,
      createdTo,
      cursor,
      sellerPublicKey,
      search,
    } = req.query;

    if (!sellerPublicKey) {
      return res.status(400).json({
        success: false,
        error: 'sellerPublicKey query parameter is required',
      });
    }

    const validStatuses = new Set([
      'PENDING',
      'PAID',
      'EXPIRED',
      'CANCELLED',
    ]);
    if (
      status !== undefined &&
      (typeof status !== 'string' ||
        !validStatuses.has(status.toUpperCase()))
    ) {
      return res.status(400).json({
        success: false,
        error: 'status must be PENDING, PAID, EXPIRED, or CANCELLED',
      });
    }
    if (
      assetCode !== undefined &&
      (typeof assetCode !== 'string' || assetCode.trim().length === 0)
    ) {
      return res.status(400).json({
        success: false,
        error: 'assetCode must be a non-empty string',
      });
    }

    const parseDateFilter = (
      value: string | string[] | undefined,
      endOfDay = false
    ): Date | undefined => {
      if (value === undefined) return undefined;
      if (typeof value !== 'string' || value.length === 0) {
        throw new Error('Date filters must be valid date strings');
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error('Date filters must be valid date strings');
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        if (date.toISOString().slice(0, 10) !== value) {
          throw new Error('Date filters must be valid date strings');
        }
        if (endOfDay) date.setUTCHours(23, 59, 59, 999);
      }

      return date;
    };

    const startDate = parseDateFilter(createdFrom as string | string[] | undefined);
    const endDate = parseDateFilter(
      createdTo as string | string[] | undefined,
      true
    );
    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        success: false,
        error: 'createdFrom must be on or before createdTo',
      });
    }

    if (cursor !== undefined && typeof cursor !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'cursor must be a single string value',
      });
    }

    if (search !== undefined && typeof search !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'search must be a single string value',
      });
    }

    const searchQuery = typeof search === 'string' ? search.trim() : '';
    if (searchQuery.length === 1) {
      return res.status(400).json({
        success: false,
        error: 'search must be at least 2 characters',
      });
    }

    // Reuse the shared parser so a limit above 100 is clamped, not honoured.
    const { limit } = parsePaginationQuery(req.query);

    const result = await invoiceService.getInvoicesBySeller(
      sellerPublicKey as string,
      typeof status === 'string' ? status.toUpperCase() : undefined,
      limit,
      cursor,
      {
        assetCode:
          typeof assetCode === 'string'
            ? assetCode.trim().toUpperCase()
            : undefined,
        createdFrom: startDate,
        createdTo: endDate,
      },
      searchQuery || undefined
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
    if (error.message === 'Date filters must be valid date strings') {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    console.error('Get invoices error:', error);
    const statusCode = error?.status === 400 ? 400 : 500;
    res.status(statusCode).json({
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
// It is a seller-only write AND the hash must be a real, confirmed partial
// payment to this invoice, otherwise anyone could pad the seller's history.
app.post('/api/invoices/:id/partial-payment', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { txHash, sellerPublicKey } = req.body ?? {};

    const invoice = await invoiceService.getInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        code: VerifyErrorCode.INVOICE_NOT_FOUND,
        error: VerifyErrorMessages[VerifyErrorCode.INVOICE_NOT_FOUND],
      });
    }
    if (!sellerPublicKey || invoice.sellerPublicKey !== sellerPublicKey) {
      return res.status(403).json({ success: false, error: 'Not the owning seller' });
    }
    if (invoice.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.INVOICE_NOT_PENDING,
        error: VerifyErrorMessages[VerifyErrorCode.INVOICE_NOT_PENDING],
      });
    }
    if (!txHash) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.TX_HASH_REQUIRED,
        error: VerifyErrorMessages[VerifyErrorCode.TX_HASH_REQUIRED],
      });
    }
    if (typeof txHash !== 'string' || !/^[0-9a-fA-F]{64}$/.test(txHash)) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.INVALID_TX_HASH,
        error: VerifyErrorMessages[VerifyErrorCode.INVALID_TX_HASH],
      });
    }
    if (!/^[0-9a-fA-F]{64}$/.test(txHash)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_TX_HASH',
        error: 'Invalid Stellar transaction hash format',
      });
    }

    // A hash that already settled (or partially paid) another invoice cannot
    // be replayed here to manufacture history.
    const invoiceWithSameHash = await invoiceService.getInvoiceByTxHash(txHash);
    if (invoiceWithSameHash && invoiceWithSameHash.id !== invoice.id) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.TX_HASH_ALREADY_USED,
        error: VerifyErrorMessages[VerifyErrorCode.TX_HASH_ALREADY_USED],
      });
    }

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

    if (!memosMatch(transaction.memo, invoice.memo)) {
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

    // Partial means strictly between zero and the invoice total, compared in
    // integer stroops so one stroop is never rounded away.
    let paidStroops: bigint;
    let invoiceStroops: bigint;
    try {
      paidStroops = amountToStroops(paymentOp.amount);
      invoiceStroops = amountToStroops(invoice.amount);
    } catch {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.AMOUNT_MISMATCH,
        error: VerifyErrorMessages[VerifyErrorCode.AMOUNT_MISMATCH],
      });
    }
    if (paidStroops <= 0n || paidStroops >= invoiceStroops) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.AMOUNT_MISMATCH,
        error: 'A partial payment must be more than zero and less than the invoice amount.',
      });
    }

    const updated = await invoiceService.recordPartialPayment(id, txHash);
    return res.json({ success: true, data: toInvoiceDTO(updated) });
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
// Seller-only, and the hash must be a confirmed anchor call for THIS invoice
// and digest: an unverified hash would let a caller record a fake anchor and
// permanently block the real one (an invoice anchors at most once).
app.post('/api/invoices/:id/anchor', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { digest, txHash, sellerPublicKey } = req.body ?? {};

    const invoice = await invoiceService.getInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    if (!sellerPublicKey || invoice.sellerPublicKey !== sellerPublicKey) {
      return res.status(403).json({ success: false, error: 'Not the owning seller' });
    }
    if (!txHash || !/^[0-9a-fA-F]{64}$/.test(txHash)) {
      return res.status(400).json({
        success: false,
        code: AnchorErrorCode.INVALID_TX_HASH,
        error: 'Invalid anchoring transaction hash',
      });
    }

    const contractId = getAnchorContractId();
    if (!contractId) {
      return res.status(409).json({
        success: false,
        code: 'ANCHOR_CONTRACT_NOT_CONFIGURED',
        error: 'Receipt anchoring contract is not configured',
      });
    }

    let txDetails: any;
    try {
      txDetails = await stellarService.getTransaction(txHash);
    } catch {
      return res.status(400).json({
        success: false,
        code: 'ANCHOR_TX_NOT_FOUND',
        error: 'Anchoring transaction was not found on chain',
      });
    }

    const check = verifyAnchorTransaction({
      transaction: txDetails.transaction,
      operations: txDetails.operations,
      sellerPublicKey,
      contractId,
      invoiceId: invoice.id,
      digest,
    });
    if (!check.ok) {
      return res.status(400).json({
        success: false,
        code: 'ANCHOR_TX_MISMATCH',
        error: 'Transaction does not contain the expected anchor call for this invoice',
        reason: check.reason,
      });
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
      invoice.sellerMuxedAddress ?? invoice.sellerPublicKey,
      invoice.amount.toString(),
      invoice.assetCode,
      invoice.memo,
      invoice.assetIssuer
    );
    const stellarPaymentUri = buildStellarPaymentUri(
      invoice.sellerMuxedAddress ?? invoice.sellerPublicKey,
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

// Duplicate an invoice (owner only). The new invoice is always pending and unpaid.
app.post('/api/invoices/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sellerPublicKey, copyCustomerEmail = false } = req.body ?? {};

    if (!sellerPublicKey || typeof sellerPublicKey !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'SELLER_REQUIRED',
        error: 'sellerPublicKey is required',
      });
    }
    if (typeof copyCustomerEmail !== 'boolean') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_COPY_CUSTOMER_EMAIL',
        error: 'copyCustomerEmail must be a boolean',
      });
    }

    const invoice = await invoiceService.duplicateInvoice(id, sellerPublicKey, copyCustomerEmail);
    const paymentUrl = `${FRONTEND_URL}/pay/${invoice.id}`;
    const stellarPaymentUri = buildStellarPaymentUri(
      invoice.sellerPublicKey,
      invoice.amount.toString(),
      invoice.assetCode,
      invoice.memo,
      invoice.assetIssuer,
    );

    res.status(201).json({
      success: true,
      data: {
        invoice: toInvoiceDTO(invoice),
        paymentUrl,
        stellarPaymentUri,
      },
    });
  } catch (error: any) {
    const status = typeof error.status === 'number' ? error.status : 400;
    res.status(status).json({
      success: false,
      code: error.code,
      error: error.message || 'Failed to duplicate invoice',
    });
  }
});

// Cancel invoice
app.post('/api/invoices/:id/cancel', async (req: Request, res: Response) => {
  try {
    await runExpirySweep(invoiceService);

    const { id } = req.params;
    const { sellerPublicKey } = req.body ?? {};
    if (!sellerPublicKey || typeof sellerPublicKey !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'SELLER_REQUIRED',
        error: 'sellerPublicKey is required',
      });
    }

    const invoice = await invoiceService.cancelInvoice(id, sellerPublicKey);

    res.json({
      success: true,
      data: toInvoiceDTO(invoice),
    });
  } catch (error: any) {
    console.error('Cancel invoice error:', error);
    const status = typeof error.status === 'number' ? error.status : 400;
    res.status(status).json({
      success: false,
      code: error.code,
      error: error.message || 'Failed to cancel invoice',
    });
  }
});

// Mark an invoice uncollectible (owning seller only; idempotent).
app.post('/api/invoices/:id/uncollectible', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sellerPublicKey } = req.body ?? {};

    if (!sellerPublicKey || typeof sellerPublicKey !== 'string') {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const invoice = await invoiceService.markUncollectible(id, sellerPublicKey);
    res.json({ success: true, data: toInvoiceDTO(invoice) });
  } catch (error: any) {
    const status = typeof error.status === 'number' ? error.status : 400;
    res.status(status).json({ success: false, code: error.code, error: error.message || 'Failed to mark invoice uncollectible' });
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
    const reportedNetwork =
      typeof req.body.network === 'string'
        ? req.body.network.trim().toUpperCase()
        : typeof req.body.networkPassphrase === 'string'
          ? req.body.networkPassphrase.trim()
          : undefined;
    const reportedKind =
      reportedNetwork === 'TESTNET' ||
      reportedNetwork === 'Test SDF Network ; September 2015' ||
      (reportedNetwork?.includes?.('TESTNET') ?? false)
        ? 'TESTNET'
        : reportedNetwork === 'PUBLIC' ||
            reportedNetwork === 'Public Global Stellar Network; September 2015' ||
            (reportedNetwork?.includes?.('PUBLIC') ?? false)
          ? 'PUBLIC'
          : undefined;
    const configuredKind =
      STELLAR_NETWORK?.trim().toUpperCase() === 'PUBLIC' ? 'PUBLIC' : 'TESTNET';
    if (reportedKind && reportedKind !== configuredKind) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.NETWORK_MISMATCH,
        error: VerifyErrorMessages[VerifyErrorCode.NETWORK_MISMATCH],
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

    if (invoice.status === 'UNCOLLECTIBLE') {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.INVOICE_NOT_PENDING,
        error: VerifyErrorMessages[VerifyErrorCode.INVOICE_NOT_PENDING],
      });
    }

    if (typeof txHash !== 'string' || !verifyTxHashSchema.safeParse(txHash).success) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.INVALID_TX_HASH,
        error: VerifyErrorMessages[VerifyErrorCode.INVALID_TX_HASH],
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

    let txDetails: { transaction: any; operations: any[] };
    try {
      txDetails = await stellarService.getTransaction(txHash);
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      if (status === 404 || error?.code === 'TX_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          code: VerifyErrorCode.TX_NOT_FOUND,
          error: VerifyErrorMessages[VerifyErrorCode.TX_NOT_FOUND],
        });
      }
      throw error;
    }
    const transaction = txDetails.transaction;

    // Horizon also returns transactions that were included in a ledger but
    // failed. Only `successful === true` counts, and it is checked before any
    // operation, memo or amount comparison. For a fee-bump Horizon reports the
    // inner transaction's result here.
    if (transaction?.successful !== true) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.TX_FAILED,
        error: VerifyErrorMessages[VerifyErrorCode.TX_FAILED],
      });
    }

    // A fee bump is allowed only when it wraps exactly the invoice payment.
    // Reject a nested fee bump and any inner operation that is not a payment
    // before trusting the operation list.
    const isFeeBump = isFeeBumpTransaction(transaction);
    if (
      isFeeBump &&
      (isNestedFeeBump(transaction) || !feeBumpWrapsOnlyPayment(txDetails.operations))
    ) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.INVALID_FEE_BUMP,
        error: VerifyErrorMessages[VerifyErrorCode.INVALID_FEE_BUMP],
      });
    }

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

    // The transaction must be bound by the invoice expiry, and must have been
    // included in a ledger no later than it, however early this request came.
    const timeBounds = checkTransactionTimeBounds({
      invoiceExpiresAt: invoice.expiresAt,
      tx: transaction,
    });
    if (!timeBounds.ok) {
      return res.status(400).json({
        success: false,
        code: timeBounds.code,
        error: VerifyErrorMessages[timeBounds.code],
      });
    }

    // A seller can otherwise pay their own invoice and produce a proof that a
    // client paid. The memo and amount match, so this is the only check that
    // catches it. Horizon reports the inner transaction source for a fee-bump,
    // so a fee-bumped self-payment is still rejected.
    const paymentSource = paymentOp.source_account ?? paymentOp.from;
    if (
      (!isFeeBump && isSelfPayment(transaction.source_account, invoice.sellerPublicKey)) ||
      isSelfPayment(paymentSource, invoice.sellerPublicKey)
    ) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.SELF_PAYMENT,
        error: VerifyErrorMessages[VerifyErrorCode.SELF_PAYMENT],
      });
    }

    // Horizon reports the inner memo on the fee-bump transaction itself, but
    // fall back to the inner object for a receipt that only nests it there.
    const transactionMemo = isFeeBump
      ? transaction.memo ?? (transaction.inner_transaction as any)?.memo
      : transaction.memo;

    if (transactionMemo !== invoice.memo) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.MEMO_MISMATCH,
        error: VerifyErrorMessages[VerifyErrorCode.MEMO_MISMATCH],
      });
    }

    if (!paymentDestinationMatchesInvoice({
      paymentTo: paymentOp.to,
      paymentToMuxed: paymentOp.to_muxed,
      paymentToMuxedId: paymentOp.to_muxed_id,
      invoiceSellerPublicKey: invoice.sellerPublicKey,
      invoiceSellerMuxedAddress: invoice.sellerMuxedAddress,
    })) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.DESTINATION_MISMATCH,
        error: VerifyErrorMessages[VerifyErrorCode.DESTINATION_MISMATCH],
      });
    }

    const receivedAmount = String(invoice.receivedAmount ?? '0');
    const remainingAmount = remainingInvoiceAmount(invoice.amount, receivedAmount);
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

// Record an on-chain reversal. The connected seller identity is supplied in
// the request and every payment field is independently checked against the
// original paid invoice before its status changes.
app.post('/api/invoices/:id/refund', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sellerPublicKey, refundTxHash } = req.body ?? {};
    if (!sellerPublicKey || !refundTxHash) {
      return res.status(400).json({ success: false, code: 'REFUND_FIELDS_REQUIRED', error: 'sellerPublicKey and refundTxHash are required' });
    }

    const invoice = await invoiceService.getInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, code: 'INVOICE_NOT_FOUND', error: 'Invoice not found' });
    }
    if (invoice.sellerPublicKey !== sellerPublicKey) {
      return res.status(403).json({ success: false, code: 'SELLER_MISMATCH', error: 'Only the invoice seller can record a refund' });
    }
    if (invoice.status === 'REFUNDED') {
      return res.status(400).json({ success: false, code: 'ALREADY_REFUNDED', error: 'Invoice has already been refunded' });
    }
    if (invoice.status !== 'PAID' || !invoice.payerPublicKey) {
      return res.status(400).json({ success: false, code: 'INVOICE_NOT_PAID', error: 'Only a paid invoice can be refunded' });
    }
    if (await invoiceService.getInvoiceByTxHash(refundTxHash)) {
      return res.status(400).json({ success: false, code: 'TX_HASH_ALREADY_USED', error: 'Transaction hash has already been used' });
    }

    const { transaction, operations } = await stellarService.getTransaction(refundTxHash);
    const paymentOp = operations.find((op: any) => op.type === 'payment');
    if (!paymentOp) {
      return res.status(400).json({ success: false, code: 'NO_PAYMENT_OPERATION', error: 'Refund transaction has no payment operation' });
    }
    const refundSource = paymentOp.source_account ?? paymentOp.from;
    const opIsNative = paymentOp.asset_type === 'native';
    const opAsset = opIsNative ? 'XLM' : paymentOp.asset_code;
    const ledger = Number(transaction?.ledger_sequence);
    const valid =
      transaction.memo === invoice.memo &&
      refundSource === invoice.sellerPublicKey &&
      paymentOp.to === invoice.payerPublicKey &&
      isDecimalEqual(paymentOp.amount, String(invoice.amount)) &&
      Number.isFinite(ledger) && ledger > 0 &&
      paymentAssetMatchesInvoice({
        paymentAsset: opAsset,
        invoiceAssetCode: invoice.assetCode,
        paymentAssetIssuer: paymentOp.asset_issuer,
        invoiceAssetIssuer: invoice.assetIssuer,
        paymentIsNative: opIsNative,
      });

    if (!valid) {
      return res.status(400).json({ success: false, code: 'REFUND_MISMATCH', error: 'Refund payment does not reverse this invoice' });
    }

    const updated = await invoiceService.markAsRefunded(
      id,
      refundTxHash,
      ledger,
      transaction.created_at ? new Date(transaction.created_at) : undefined,
    );
    return res.json({ success: true, data: toInvoiceDTO(updated), message: 'Refund verified on Stellar' });
  } catch (error: any) {
    console.error('Refund verification error:', error);
    return res.status(typeof error.status === 'number' ? error.status : 500).json({
      success: false,
      code: error.code ?? 'REFUND_VERIFY_FAILED',
      error: error.message || 'Failed to verify refund',
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

// Export invoices as CSV (scoped to sellerPublicKey)
function csvEscapeBackend(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function handleInvoiceCsvExport(req: Request, res: Response) {
  try {
    await runExpirySweep(invoiceService);
    const { sellerPublicKey, status } = req.query;
    if (!sellerPublicKey || typeof sellerPublicKey !== 'string') {
      return res.status(400).json({ success: false, error: 'sellerPublicKey query parameter is required' });
    }

    const exportStatus = typeof status === 'string' && status ? status.toLowerCase() : 'paid';
    if (exportStatus !== 'paid' && exportStatus !== 'all') {
      return res.status(400).json({
        success: false,
        error: 'status must be "paid" or "all"',
      });
    }

    const paidOnly = exportStatus === 'paid';
    const invoices: any[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | undefined;

    do {
      const page = await invoiceService.getInvoicesBySeller(
        sellerPublicKey,
        paidOnly ? 'PAID' : undefined,
        MAX_PAGE_LIMIT,
        cursor,
      );
      invoices.push(
        ...page.invoices.filter((invoice: any) => invoice.sellerPublicKey === sellerPublicKey),
      );
      cursor = page.nextCursor;

      if (cursor && seenCursors.has(cursor)) {
        throw new Error('Invoice CSV pagination did not advance');
      }
      if (cursor) seenCursors.add(cursor);
    } while (cursor);

    const headers = [
      'Invoice ID',
      'Invoice Number',
      'Created At',
      'Paid At',
      'Amount',
      'Asset',
      'Issuer',
      'Memo',
      'Payer',
      'Transaction Hash',
    ];

    const rows = invoices.map((inv: any) => [
      inv.id,
      inv.invoiceNumber || inv.number || inv.invoiceNo || '',
      inv.createdAt ? new Date(inv.createdAt).toISOString() : '',
      inv.paidAt ? new Date(inv.paidAt).toISOString() : '',
      inv.amount,
      inv.assetCode,
      inv.assetIssuer || '',
      inv.memo || '',
      inv.payerPublicKey || '',
      inv.status === 'PAID' ? inv.paymentTxHash || '' : '',
    ]);

    const csv = [headers.map(csvEscapeBackend).join(','), ...rows.map((row) => row.map(csvEscapeBackend).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${paidOnly ? 'quittance-paid-invoices' : 'quittance-invoices'}.csv"`,
    );
    res.send('\uFEFF' + csv);
  } catch (error: any) {
    console.error('Export CSV error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to export CSV' });
  }
}

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if ((err as Error & { status?: number }).status === 400) {
    return res.status(400).json({ success: false, error: 'Malformed request body' });
  }
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
  startMvpPaymentMonitor(invoiceService, stellarService);

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
