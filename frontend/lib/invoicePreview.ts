import type { Metadata } from 'next';

/**
 * Link-preview metadata for a payment link.
 *
 * A link pasted into a chat should name the amount, the asset and the seller.
 * It must never carry private or unrelated invoice data: no client email, no
 * payer address, no seller email, no memo, and never another invoice's fields.
 *
 * This module is intentionally server-safe: it does not import Freighter, the
 * wallet store or any browser-only module, so `generateMetadata` works before
 * the payer has a wallet extension.
 */

export interface InvoicePreviewSource {
  id?: unknown;
  amount?: unknown;
  assetCode?: unknown;
  sellerName?: unknown;
  [key: string]: unknown;
}

const MISSING_TITLE = 'Invoice not found | Quittance';
const MISSING_DESCRIPTION = 'This payment link does not match an invoice.';
const DEFAULT_API_URL = 'http://localhost:3001/api';
const PREVIEW_TIMEOUT_MS = 3000;

function cleanText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

/**
 * Format an invoice amount for a preview without float noise.
 * Returns an empty string when the amount is missing or not a finite number.
 */
export function formatPreviewAmount(amount: unknown): string {
  const value =
    typeof amount === 'number'
      ? amount
      : typeof amount === 'string' && amount.trim() !== ''
        ? Number(amount)
        : Number.NaN;

  if (!Number.isFinite(value)) {
    return '';
  }

  return value.toLocaleString('en-US', { maximumFractionDigits: 7 });
}

/**
 * Build the head metadata for a pay link.
 *
 * Only `amount`, `assetCode` and `sellerName` (when stored) are read from the
 * invoice. The asset is quoted by its code — never a human-readable alias — so
 * a credit asset cannot masquerade as another asset.
 */
export function buildInvoicePreviewMetadata(
  invoice: InvoicePreviewSource | null | undefined,
): Metadata {
  if (!invoice) {
    return {
      title: MISSING_TITLE,
      description: MISSING_DESCRIPTION,
      openGraph: {
        title: MISSING_TITLE,
        description: MISSING_DESCRIPTION,
        siteName: 'Quittance',
        type: 'website',
      },
    };
  }

  const amount = formatPreviewAmount(invoice.amount);
  const asset = cleanText(invoice.assetCode);
  const seller = cleanText(invoice.sellerName);
  const amountAndAsset = [amount, asset].filter(Boolean).join(' ');

  const title = amountAndAsset
    ? seller
      ? `Pay ${amountAndAsset} to ${seller} | Quittance`
      : `Pay ${amountAndAsset} | Quittance`
    : seller
      ? `Invoice from ${seller} | Quittance`
      : 'Stellar invoice | Quittance';

  const description = amountAndAsset
    ? seller
      ? `Invoice for ${amountAndAsset} from ${seller}.`
      : `Invoice for ${amountAndAsset} on Quittance.`
    : seller
      ? `Invoice from ${seller} on Quittance.`
      : 'Review and pay a Stellar invoice on Quittance.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'Quittance',
      type: 'website',
    },
  };
}

function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
}

/**
 * Fetch exactly one invoice for preview rendering.
 *
 * Returns `null` for a missing id, a network/API failure, a non-OK response,
 * or a payload whose id does not match the requested id. The last guard means
 * a misrouted response can never preview another invoice's data.
 */
export async function fetchInvoiceForPreview(id: string): Promise<InvoicePreviewSource | null> {
  if (typeof id !== 'string' || id.trim() === '') {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PREVIEW_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBaseUrl()}/invoices/${encodeURIComponent(id)}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { data?: unknown } | null;
    const invoice = body?.data;

    if (!invoice || typeof invoice !== 'object') {
      return null;
    }

    const source = invoice as InvoicePreviewSource;
    if (cleanText(source.id) !== id) {
      return null;
    }

    return source;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
