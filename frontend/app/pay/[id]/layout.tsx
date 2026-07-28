import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pay a Stellar invoice | Quittance',
  description:
    'Review and pay a Stellar invoice through Quittance, then keep verifiable on-chain payment proof.',
  openGraph: {
    title: 'Pay a Stellar invoice | Quittance',
    description:
      'Review and pay a Stellar invoice through Quittance, then keep verifiable on-chain payment proof.',
    siteName: 'Quittance',
    locale: 'en_US',
    type: 'website',
  },
};

export default function PaymentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
