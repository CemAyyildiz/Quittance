import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Share feedback | Quittance',
  description:
    'Tell us how Quittance is working for you — send feedback on Stellar invoicing and on-chain payment proof.',
  openGraph: {
    title: 'Share feedback | Quittance',
    description:
      'Tell us how Quittance is working for you — send feedback on Stellar invoicing and on-chain payment proof.',
    siteName: 'Quittance',
    locale: 'en_US',
    type: 'website',
  },
};

export default function FeedbackLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
