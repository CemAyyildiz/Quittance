import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { requestId } from "./middleware/request-id";
import { createInvoiceSchema } from "./utils/validation";
import invoiceService from "./services/invoice-memory.service";
import {
  generatePaymentQR,
  generateStellarPaymentQR,
  buildStellarPaymentUri,
} from "./utils/qrcode";
import stellarService, { PaymentRecord } from "./services/stellar.service";
import { rateLimitIfEnabled } from "./middleware/rate-limit-stub";
import healthDetailRouter from "./routes/health-detail";
import { toInvoiceDTO } from "./utils/invoice-dto";
import { VerifyErrorCode, VerifyErrorMessages } from "./utils/verify-errors";
import {
  assertInvoiceSettleable,
  runExpirySweep,
  startExpirySweep,
} from "./utils/invoice-expiry";
import { verifyInvoicePayment } from "./utils/verify-invoice-payment";
import memoryStorage from "./storage/memory-storage";

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const ALLOW_SIMULATE = process.env.ALLOW_SIMULATE === "true";

// Middleware
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

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
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "Quittance API (MVP)",
    version: "1.0.0",
    status: "running",
    mode: "in-memory",
    documentation: "/api/health",
  });
});

// Health detail router (mounted before the simple health check)
app.use("/api", healthDetailRouter);

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Quittance API",
    mode: "MVP - In-Memory Storage (Dynamic Seller)",
    message: "Each user uses their own wallet for payments",
  });
});

// Create invoice
app.post("/api/invoices", async (req: Request, res: Response) => {
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
      invoice.assetIssuer,
    );
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
        qrCode: qrCodeDataUrl,
        stellarQrCode,
        stellarPaymentUri,
      },
    });
  } catch (error: any) {
    console.error("Create invoice error:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to create invoice",
    });
  }
});

// Registered before `/api/invoices/:id`: Express matches in registration
// order, so with `:id` first this route was shadowed and every request for
// it returned "Invoice not found".
// Get stats (scoped to seller)
app.get("/api/invoices/stats", async (req: Request, res: Response) => {
  try {
    await runExpirySweep(invoiceService);

    const { sellerPublicKey } = req.query;

    if (!sellerPublicKey) {
      return res.status(400).json({
        success: false,
        error: "sellerPublicKey query parameter is required",
      });
    }

    const stats = await invoiceService.getInvoiceStats(
      sellerPublicKey as string,
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get statistics",
    });
  }
});

// Get invoice by ID
app.get("/api/invoices/:id", async (req: Request, res: Response) => {
  try {
    // Swept on read as well as on the timer, so a lookup one second after
    // expiry cannot report a stale PENDING while waiting for the next sweep.
    await runExpirySweep(invoiceService);

    const { id } = req.params;
    const invoice = await invoiceService.getInvoiceById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: "Invoice not found",
      });
    }

    res.json({
      success: true,
      data: toInvoiceDTO(invoice),
    });
  } catch (error: any) {
    console.error("Get invoice error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get invoice",
    });
  }
});

// Get all invoices (scoped by sellerPublicKey when provided)
app.get("/api/invoices", async (req: Request, res: Response) => {
  try {
    await runExpirySweep(invoiceService);

    const { status, limit = 50, offset = 0, sellerPublicKey } = req.query;

    if (!sellerPublicKey) {
      return res.status(400).json({
        success: false,
        error: "sellerPublicKey query parameter is required",
      });
    }

    const invoices = await invoiceService.getInvoicesBySeller(
      sellerPublicKey as string,
      status as string | undefined,
      parseInt(limit as string),
      parseInt(offset as string),
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
    console.error("Get invoices error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get invoices",
    });
  }
});

// Get payment info
app.get(
  "/api/invoices/:id/payment-info",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const invoice = await invoiceService.getInvoiceById(id);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: "Invoice not found",
        });
      }

      const paymentUrl = `${FRONTEND_URL}/pay/${invoice.id}`;
      const qrCodeDataUrl = await generatePaymentQR(paymentUrl);
      const stellarQrCode = await generateStellarPaymentQR(
        invoice.sellerPublicKey,
        invoice.amount.toString(),
        invoice.assetCode,
        invoice.memo,
        invoice.assetIssuer,
      );
      const stellarPaymentUri = buildStellarPaymentUri(
        invoice.sellerPublicKey,
        invoice.amount.toString(),
        invoice.assetCode,
        invoice.memo,
        invoice.assetIssuer,
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
      console.error("Get payment info error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get payment info",
      });
    }
  },
);

// Cancel invoice
app.post("/api/invoices/:id/cancel", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await invoiceService.cancelInvoice(id);

    res.json({
      success: true,
      data: toInvoiceDTO(invoice),
    });
  } catch (error: any) {
    console.error("Cancel invoice error:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to cancel invoice",
    });
  }
});

// Verify payment against Horizon (memo + amount + destination)
app.post("/api/invoices/:id/verify", async (req: Request, res: Response) => {
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

    if (invoice.status === "PAID") {
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
    const paymentOp = txDetails.operations.find(
      (op: any) => op.type === "payment",
    );

    if (!paymentOp) {
      return res.status(400).json({
        success: false,
        code: VerifyErrorCode.NO_PAYMENT_OPERATION,
        error: VerifyErrorMessages[VerifyErrorCode.NO_PAYMENT_OPERATION],
      });
    }

    const opIsNative = paymentOp.asset_type === "native";
    const opAsset = opIsNative ? "XLM" : paymentOp.asset_code;
    const verification = verifyInvoicePayment({
      txMemo: transaction.memo,
      invoiceMemo: invoice.memo,
      paymentTo: paymentOp.to,
      invoiceSellerPublicKey: invoice.sellerPublicKey,
      paymentAmount: paymentOp.amount,
      invoiceAmount: invoice.amount,
      paymentAsset: opAsset,
      invoiceAssetCode: invoice.assetCode,
      paymentAssetIssuer: paymentOp.asset_issuer,
      invoiceAssetIssuer: invoice.assetIssuer,
      paymentIsNative: opIsNative,
    });

    if (!verification.ok) {
      return res.status(400).json({
        success: false,
        code: verification.code,
        error: VerifyErrorMessages[verification.code],
      });
    }

    const updatedInvoice = await invoiceService.markAsPaid(
      id,
      txHash,
      paymentOp.from,
    );

    res.json({
      success: true,
      data: toInvoiceDTO(updatedInvoice),
      message: "Payment verified on Stellar",
    });
  } catch (error: any) {
    console.error("Verify payment error:", error);
    res.status(500).json({
      success: false,
      code: VerifyErrorCode.VERIFY_FAILED,
      error: VerifyErrorMessages[VerifyErrorCode.VERIFY_FAILED],
    });
  }
});

// Simulate payment — only when ALLOW_SIMULATE=true (local testing)
app.post(
  "/api/invoices/:id/simulate-payment",
  async (req: Request, res: Response) => {
    try {
      if (!ALLOW_SIMULATE) {
        return res.status(404).json({
          success: false,
          error: "Endpoint not found",
        });
      }

      const { id } = req.params;
      const invoice = await invoiceService.getInvoiceById(id);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: "Invoice not found",
        });
      }

      if (invoice.status === "PAID") {
        return res.status(400).json({
          success: false,
          error:
            "This invoice has already been paid. Cannot accept duplicate payment.",
        });
      }

      if (invoice.status !== "PENDING") {
        return res.status(400).json({
          success: false,
          error: "Invoice is not pending",
        });
      }

      const mockTxHash = `MOCK_TX_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      const mockPayerKey = "GXXXSIMULATEDPAYERXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

      const updatedInvoice = await invoiceService.markAsPaid(
        id,
        mockTxHash,
        mockPayerKey,
      );

      res.json({
        success: true,
        data: toInvoiceDTO(updatedInvoice),
        message: "Payment simulated successfully",
      });
    } catch (error: any) {
      console.error("Simulate payment error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to simulate payment",
      });
    }
  },
);

// Mock Stellar endpoints (MVP için)
app.get("/api/stellar/account", (req: Request, res: Response) => {
  const { publicKey } = req.query;
  res.json({
    success: true,
    data: {
      publicKey: publicKey || "EXAMPLE",
      balances: [{ assetCode: "XLM", balance: "1000.0000000" }],
      sequence: "12345678",
      subentryCount: 0,
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

export interface MvpPaymentMonitor {
  stop: () => void;
}

/**
 * Judge one incoming Horizon payment against the matching memo invoice.
 * Exported for deterministic tests and for reuse with Horizon feeds.
 */
export async function processIncomingPayment(
  payment: PaymentRecord,
  store: typeof invoiceService = invoiceService,
): Promise<void> {
  if (!payment.memo) {
    return;
  }

  const invoice = await store.getInvoiceByMemo(payment.memo);
  if (!invoice) {
    return;
  }

  const settleable = assertInvoiceSettleable(invoice);
  if (!settleable.ok || invoice.status !== "PENDING") {
    return;
  }

  const result = verifyInvoicePayment({
    txMemo: payment.memo,
    invoiceMemo: invoice.memo,
    paymentTo: payment.to,
    invoiceSellerPublicKey: invoice.sellerPublicKey,
    paymentAmount: payment.amount,
    invoiceAmount: invoice.amount,
    paymentAsset: payment.assetCode,
    invoiceAssetCode: invoice.assetCode,
    paymentAssetIssuer: payment.assetIssuer,
    invoiceAssetIssuer: invoice.assetIssuer,
    paymentIsNative: payment.isNative ?? payment.assetCode === "XLM",
  });

  if (!result.ok) {
    return;
  }

  await store.markAsPaid(invoice.id, payment.txHash, payment.from);
}

/**
 * Stream incoming payments for every pending invoice seller.
 *
 * The refresh timer discovers newly-created seller accounts. Each stream starts
 * at `now`, so only new payments are considered. Stream failures are logged and
 * never mutate invoice state.
 */
export function startMvpPaymentMonitor(
  stellar: typeof stellarService = stellarService,
  refreshIntervalMs: number = 30_000,
): MvpPaymentMonitor {
  const streams = new Map<string, () => void>();

  const refresh = () => {
    const pending = memoryStorage.getAllInvoices({ status: "PENDING" });
    const sellerKeys = new Set(
      pending.map((invoice) => invoice.sellerPublicKey),
    );

    for (const sellerKey of streams.keys()) {
      if (!sellerKeys.has(sellerKey)) {
        streams.get(sellerKey)?.();
        streams.delete(sellerKey);
      }
    }

    for (const sellerKey of sellerKeys) {
      if (streams.has(sellerKey)) continue;

      try {
        const close = stellar.streamPayments(
          sellerKey,
          (payment) => {
            void processIncomingPayment(payment).catch((error) => {
              console.error(
                "Payment monitor failed to process payment:",
                error,
              );
            });
          },
          (error) => {
            console.error("Horizon payment stream failed:", error);
          },
        );
        streams.set(sellerKey, close);
      } catch (error) {
        console.error(
          `Could not start payment stream for ${sellerKey}:`,
          error,
        );
      }
    }
  };

  refresh();
  const timer = setInterval(refresh, refreshIntervalMs);
  timer.unref?.();

  return {
    stop: () => {
      clearInterval(timer);
      for (const close of streams.values()) close();
      streams.clear();
    },
  };
}

// Start server
//
// Listening (and the sweep timer) are skipped under test so the module can be
// imported by supertest without binding a port or leaving a timer running.
if (process.env.NODE_ENV !== "test") {
  startExpirySweep(invoiceService);
  startMvpPaymentMonitor();

  app.listen(PORT, () => {
    console.log("\n🚀 Quittance Backend (MVP Mode)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 API: http://localhost:${PORT}/api`);
    console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
    console.log(`💾 Storage: In-Memory (No Database)`);
    console.log(`💰 Dynamic Seller: Each user uses their own wallet!`);
    console.log(`🌐 Frontend: ${FRONTEND_URL}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });
}

export default app;
