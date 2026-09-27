import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stellar invoice details | Quittance',
  description:
    'Review Stellar invoice details on Quittance, including payment status, amounts, and verifiable on-chain proof.',
  openGraph: {
    title: 'Stellar invoice details | Quittance',
    description:
      'Review Stellar invoice details on Quittance, including payment status, amounts, and verifiable on-chain proof.',
    siteName: 'Quittance',
    locale: 'en_US',
    type: 'website',
  },
};

export default function InvoiceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
