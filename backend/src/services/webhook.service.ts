// Paid-invoice webhook delivery.
//
// Enabled only when both WEBHOOK_URL and WEBHOOK_SECRET are set. Delivery is
// fire-and-forget so a slow or failing receiver can never keep an invoice from
// being marked paid: failures are retried with backoff and then dropped.
import { createHmac } from 'crypto';
import logger from '../utils/log';

export const WEBHOOK_SIGNATURE_HEADER = 'X-Quittance-Signature';
export const WEBHOOK_EVENT = 'invoice.paid';

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;
const REQUEST_TIMEOUT_MS = 5000;

/** The subset of an invoice the paid webhook reports. */
export interface WebhookInvoice {
  id: string;
  amount: number;
  assetCode: string;
  memo: string;
  payerPublicKey?: string;
  paymentTxHash?: string;
}

export interface InvoicePaidWebhookPayload {
  invoiceId: string;
  amount: number;
  asset: string;
  memo: string;
  payer: string;
  txHash: string;
}

interface WebhookConfig {
  url: string;
  secret: string;
}

export function buildInvoicePaidPayload(invoice: WebhookInvoice): InvoicePaidWebhookPayload {
  return {
    invoiceId: invoice.id,
    amount: invoice.amount,
    asset: invoice.assetCode,
    memo: invoice.memo,
    payer: invoice.payerPublicKey ?? '',
    txHash: invoice.paymentTxHash ?? '',
  };
}

/** HMAC-SHA256 over the exact raw request body. */
export function signWebhookBody(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

/**
 * Read the webhook configuration. Returns null when delivery is disabled:
 * no URL means the feature is off; a URL without a secret is a
 * misconfiguration, which is logged once per attempted delivery.
 */
export function readWebhookConfig(): WebhookConfig | null {
  const url = process.env.WEBHOOK_URL?.trim();
  if (!url) {
    return null;
  }

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    logger.warn('Webhook delivery disabled: WEBHOOK_SECRET is not set');
    return null;
  }

  return { url, secret };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postOnce(body: string, config: WebhookConfig): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [WEBHOOK_SIGNATURE_HEADER]: signWebhookBody(body, config.secret),
        'x-quittance-event': WEBHOOK_EVENT,
      },
      body,
      signal: controller.signal,
    });

    // Drain the response so the socket can be reused or released.
    await response.text().catch(() => undefined);
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Deliver one paid-invoice webhook, retrying with exponential backoff.
 * Returns true when the receiver accepted it and false when it was dropped.
 * Never logs the URL or the secret.
 */
export async function deliverInvoicePaid(invoice: WebhookInvoice): Promise<boolean> {
  const config = readWebhookConfig();
  if (!config) {
    return false;
  }

  const body = JSON.stringify(buildInvoicePaidPayload(invoice));

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (await postOnce(body, config)) {
      logger.info('Paid-invoice webhook delivered', { invoiceId: invoice.id, attempt });
      return true;
    }

    if (attempt < MAX_ATTEMPTS) {
      await delay(BASE_BACKOFF_MS * 2 ** (attempt - 1));
    }
  }

  logger.error('Paid-invoice webhook dropped after retries', {
    invoiceId: invoice.id,
    attempts: MAX_ATTEMPTS,
  });
  return false;
}

const inFlight = new Set<Promise<void>>();

/**
 * Start delivery without blocking the caller. The invoice is already paid by
 * the time this runs; a failed delivery only produces a log line.
 */
export function queueInvoicePaidWebhook(invoice: WebhookInvoice): void {
  const task: Promise<void> = deliverInvoicePaid(invoice).then(
    () => undefined,
    (error) => {
      logger.error('Paid-invoice webhook failed unexpectedly', {
        invoiceId: invoice.id,
        reason: error instanceof Error ? error.message : String(error),
      });
    },
  );

  inFlight.add(task);
  void task.finally(() => inFlight.delete(task));
}

/** Await queued deliveries. Used by tests; harmless in production. */
export async function waitForWebhookDeliveries(): Promise<void> {
  while (inFlight.size > 0) {
    await Promise.allSettled([...inFlight]);
  }
}
