import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Quittance',
  description: 'Track your Stellar invoices and on-chain payment status in one place.',
  openGraph: {
    title: 'Dashboard | Quittance',
    description: 'Track your Stellar invoices and on-chain payment status in one place.',
    siteName: 'Quittance',
    locale: 'en_US',
    type: 'website',
  },
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
