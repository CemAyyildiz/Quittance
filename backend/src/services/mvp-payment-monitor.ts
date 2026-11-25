import { assertInvoiceSettleable, runExpirySweep } from '../utils/invoice-expiry';
import { verifyInvoicePayment } from '../utils/verify-invoice-payment';
import { amountsMatch } from '../utils/amount-compare';
import type { PaymentRecord } from './stellar.service';

export interface MvpPaymentStore {
  markExpiredInvoices(): Promise<number> | number;
  getPendingInvoices(): any[];
  getInvoiceByTxHash(txHash: string): Promise<any | null> | any | null;
  markAsPaid(
    invoiceId: string,
    txHash: string,
    payerPublicKey: string,
    ledgerSeq?: number,
    paidAt?: Date,
  ): Promise<any>;
}

export interface MvpPaymentFeed {
  getRecentPayments(publicKey: string, limit?: number): Promise<PaymentRecord[]>;
}

export const MVP_PAYMENT_POLL_INTERVAL_MS = 5_000;

export async function runMvpPaymentMonitorPass(
  store: MvpPaymentStore,
  feed: MvpPaymentFeed,
  now: number = Date.now(),
  limit: number = 50,
): Promise<void> {
  await runExpirySweep(store);

  const pending = store.getPendingInvoices();
  const sellers = new Map<string, any[]>();
  for (const invoice of pending) {
    const settleable = assertInvoiceSettleable(invoice, now);
    if (!settleable.ok) continue;
    const invoices = sellers.get(invoice.sellerPublicKey) ?? [];
    invoices.push(invoice);
    sellers.set(invoice.sellerPublicKey, invoices);
  }

  for (const [sellerPublicKey, invoices] of sellers) {
    let payments: PaymentRecord[];
    try {
      payments = await feed.getRecentPayments(sellerPublicKey, limit);
    } catch (error) {
      console.error(`Horizon payment poll failed for seller ${sellerPublicKey}:`, error);
      continue;
    }

    for (const payment of payments) {
      if (payment.to !== sellerPublicKey) continue;

      for (const invoice of invoices) {
        if (invoice.status !== 'PENDING') continue;
        if (!assertInvoiceSettleable(invoice, now).ok) continue;
        if (await store.getInvoiceByTxHash(payment.txHash)) continue;
        if (!amountsMatch(payment.amount, invoice.amount)) continue;

        const result = verifyInvoicePayment({
          txMemo: payment.memo,
          // Horizon always reports a memo type; a record without one cannot
          // prove its memo is text, so it is treated as no memo at all.
          txMemoType: payment.memoType ?? 'none',
          invoiceMemo: invoice.memo,
          paymentTo: payment.to,
          invoiceSellerPublicKey: invoice.sellerPublicKey,
          paymentSource: payment.from,
          paymentAmount: payment.amount,
          invoiceAmount: invoice.amount,
          paymentAsset: payment.assetCode,
          invoiceAssetCode: invoice.assetCode,
          paymentAssetIssuer: payment.assetIssuer,
          invoiceAssetIssuer: invoice.assetIssuer,
          paymentIsNative: payment.assetCode === 'XLM' && !payment.assetIssuer,
        });

        if (!result.ok) continue;
        if (!Number.isFinite(payment.ledger) || payment.ledger <= 0) continue;

        await store.markAsPaid(
          invoice.id,
          payment.txHash,
          payment.from,
          payment.ledger,
          payment.createdAt ? new Date(payment.createdAt) : undefined,
        );
        console.log('Payment auto-confirmed:', {
          invoiceId: invoice.id,
          txHash: payment.txHash,
          payerPublicKey: payment.from,
        });
      }
    }
  }
}

export function startMvpPaymentMonitor(
  store: MvpPaymentStore,
  feed: MvpPaymentFeed,
  intervalMs: number = MVP_PAYMENT_POLL_INTERVAL_MS,
): () => void {
  void runMvpPaymentMonitorPass(store, feed);
  const timer = setInterval(() => {
    void runMvpPaymentMonitorPass(store, feed);
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
