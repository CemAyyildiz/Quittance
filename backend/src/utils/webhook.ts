import crypto from 'crypto';

interface WebhookPayload {
  invoiceId: string;
  amount: number;
  assetCode: string;
  memo: string;
  payerPublicKey: string;
  txHash: string;
  status: string;
  paidAt: string | null;
}

/**
 * Sign a webhook payload with HMAC-SHA256.
 * The signature is computed over the JSON-serialized payload body.
 *
 * @param payload - The webhook payload object
 * @param secret - The webhook secret key
 * @returns The hex-encoded HMAC-SHA256 signature
 */
export function signWebhookPayload(payload: WebhookPayload, secret: string): string {
  const jsonBody = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(jsonBody).digest('hex');
}

/**
 * Build the webhook payload for when an invoice becomes paid.
 *
 * @param invoice - The invoice object from memory storage
 * @returns The webhook payload
 */
export function buildWebhookPayload(invoice: any): WebhookPayload {
  return {
    invoiceId: invoice.id,
    amount: invoice.amount,
    assetCode: invoice.assetCode,
    memo: invoice.memo,
    payerPublicKey: invoice.payerPublicKey || '',
    txHash: invoice.paymentTxHash || '',
    status: invoice.status,
    paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
  };
}

/**
 * Send a webhook POST with retry logic and exponential backoff.
 *
 * @param url - The webhook endpoint URL
 * @param payload - The webhook payload object
 * @param secret - The HMAC-SHA256 secret for signature header
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelayMs - Base delay in milliseconds for backoff (default: 1000)
 * @returns Promise resolving to { success: true } or { success: false, error: Error }
 */
export async function sendWebhookWithRetry(
  url: string,
  payload: WebhookPayload,
  secret: string,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<{ success: boolean; error?: Error }> {
  const signature = signWebhookPayload(payload, secret);
  const jsonBody = JSON.stringify(payload);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': signature,
    'X-Webhook-Event': 'invoice.paid',
  };

  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: jsonBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Consider 2xx as success
      if (response.ok) {
        return { success: true };
      }

      // If the server returns an error, still retry
      lastError = new Error(`Webhook returned ${response.status}`);
      throw lastError;
    } catch (error: any) {
      lastError = error;

      // If abort error (timeout), don't retry after last attempt
      if (attempt >= maxRetries) {
        break;
      }

      // Exponential backoff: baseDelayMs * 2^(attempt-1)
      const backoffMs = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `Webhook attempt ${attempt} failed: ${lastError.message}. ` +
          `Retrying in ${backoffMs}ms...`
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError || new Error('Webhook delivery failed after all retries'),
  };
}

/**
 * Module-level set tracking invoice IDs that have already had webhooks sent.
 * Resets on process restart (acceptable for MVP in-memory setup).
 */
const sentWebhooks = new Set<string>();

/**
 * Check if a webhook has already been sent for this invoice.
 *
 * @param invoiceId - The invoice ID
 * @returns True if already sent, false if not
 */
export function isWebhookSent(invoiceId: string): boolean {
  return sentWebhooks.has(invoiceId);
}

/**
 * Mark a webhook as sent for this invoice.
 *
 * @param invoiceId - The invoice ID
 */
export function markWebhookSent(invoiceId: string): void {
  sentWebhooks.add(invoiceId);
}