import type { Metadata } from 'next';
import { buildInvoicePreviewMetadata, fetchInvoiceForPreview } from '@/lib/invoicePreview';

interface PaymentLayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

/**
 * Link previews are generated on the server from a single invoice lookup, so
 * they work before Freighter is installed and never include unrelated data.
 */
export async function generateMetadata({
  params,
}: Pick<PaymentLayoutProps, 'params'>): Promise<Metadata> {
  const invoice = await fetchInvoiceForPreview(params.id);
  return buildInvoicePreviewMetadata(invoice);
}

export default function PaymentLayout({ children }: Pick<PaymentLayoutProps, 'children'>) {
  return children;
}
