import type { Metadata } from 'next';
import { Instrument_Serif } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'sonner';
import './globals.css';

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Quittance — Invoice on Stellar. Keep the proof.',
  description:
    'Create Stellar invoices, get paid on-chain, and download or email your payment proof — without exposing anyone else’s wallet history.',
  openGraph: {
    title: 'Quittance — Invoice on Stellar. Keep the proof.',
    description:
      'Create Stellar invoices, get paid on-chain, and download or email your payment proof — without exposing anyone else’s wallet history.',
    siteName: 'Quittance',
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${instrumentSerif.variable}`}>
      <body className={`${GeistSans.className} antialiased`}>
        <Toaster position="top-right" richColors />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
