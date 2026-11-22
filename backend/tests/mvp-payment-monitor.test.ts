import { describe, it, expect, beforeEach, vi } from "vitest";

const SELLER = "GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL";
const PAYER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

vi.mock("../src/services/stellar.service", () => ({
  default: {
    getTransaction: vi.fn(),
    streamPayments: vi.fn(),
  },
}));

const { processIncomingPayment } = await import("../src/server-mvp");
const { default: memoryStorage } =
  await import("../src/storage/memory-storage");
const { default: invoiceService } =
  await import("../src/services/invoice-memory.service");

function createInvoice(overrides: Record<string, unknown> = {}) {
  return memoryStorage.createInvoice({
    sellerPublicKey: SELLER,
    amount: 10,
    assetCode: "XLM",
    memo: "INV-MATCH",
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  });
}

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: "123",
    txHash: "b".repeat(64),
    from: PAYER,
    to: SELLER,
    amount: "10.0000000",
    assetCode: "XLM",
    memo: "INV-MATCH",
    ledger: 1,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as any;
}

beforeEach(() => {
  memoryStorage.clear();
});

describe("MVP incoming payment monitor", () => {
  it("marks a matching payment paid and stores its hash and payer", async () => {
    const invoice = createInvoice();

    await processIncomingPayment(payment(), invoiceService);

    const updated = memoryStorage.getInvoiceById(invoice.id);
    expect(updated?.status).toBe("PAID");
    expect(updated?.paymentTxHash).toBe("b".repeat(64));
    expect(updated?.payerPublicKey).toBe(PAYER);
  });

  it("ignores a mismatched payment", async () => {
    const invoice = createInvoice();

    await processIncomingPayment(
      payment({ amount: "9.0000000" }),
      invoiceService,
    );

    expect(memoryStorage.getInvoiceById(invoice.id)?.status).toBe("PENDING");
  });

  it("keeps the first matching payment hash when a second one arrives", async () => {
    const invoice = createInvoice();

    await processIncomingPayment(payment(), invoiceService);
    await processIncomingPayment(
      payment({ txHash: "c".repeat(64), from: "GOTHER" }),
      invoiceService,
    );

    const updated = memoryStorage.getInvoiceById(invoice.id);
    expect(updated?.paymentTxHash).toBe("b".repeat(64));
    expect(updated?.payerPublicKey).toBe(PAYER);
  });

  it("does not settle an expired invoice", async () => {
    const invoice = createInvoice({ expiresAt: new Date(Date.now() - 60_000) });

    await processIncomingPayment(payment(), invoiceService);

    const updated = memoryStorage.getInvoiceById(invoice.id);
    expect(updated?.status).not.toBe("PAID");
  });

  it("ignores a payment with the wrong memo or destination", async () => {
    const invoice = createInvoice();

    await processIncomingPayment(
      payment({ memo: "OTHER-MEMO" }),
      invoiceService,
    );
    await processIncomingPayment(
      payment({ to: "GOTHERDESTINATION" }),
      invoiceService,
    );

    expect(memoryStorage.getInvoiceById(invoice.id)?.status).toBe("PENDING");
  });
});
