'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import InvoiceForm from '@/components/InvoiceForm';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import WalletConnect from '@/components/WalletConnect';
import UserProfile from '@/components/UserProfile';
import AssetLogo from '@/components/AssetLogo';
import NetworkBadge from '@/components/NetworkBadge';
import { useWalletStore } from '@/lib/store';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { shareInvoiceByEmail } from '@/lib/export';
import { checkWalletConnection } from '@/lib/stellar';
import {
  FREIGHTER_INSTALL_URL,
  shouldShowFreighterInstallGuidance,
} from '@/lib/freighterGuidance';

function FreighterInstallGuidance() {
  return (
    <p role="alert" className="text-sm leading-relaxed text-[var(--muted)]">
      Freighter is unavailable or access failed.{' '}
      <a
        href={FREIGHTER_INSTALL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[var(--teal)] underline underline-offset-4 hover:text-[var(--ink)]"
      >
        Install Freighter
      </a>
      , unlock it, then try connecting again.
    </p>
  );
}

export default function HomePage() {
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [freighterUnavailable, setFreighterUnavailable] = useState(false);
  const { publicKey, connected } = useWalletStore();
  const showFreighterGuidance = shouldShowFreighterInstallGuidance(
    connected,
    freighterUnavailable,
  );

  const handleInvoiceCreated = (result: any) => setCreatedInvoice(result);
  const handleWalletDisconnected = () => setCreatedInvoice(null);
  const handleWalletConnected = () => setFreighterUnavailable(false);
  const handleWalletConnectionFailure = () => setFreighterUnavailable(true);

  useEffect(() => {
    if (connected) {
      setFreighterUnavailable(false);
      return;
    }

    let active = true;
    checkWalletConnection().then((available) => {
      if (active && !available) {
        setFreighterUnavailable(true);
      }
    });

    return () => {
      active = false;
    };
  }, [connected]);

  const scrollToCreate = () => {
    document.getElementById('create')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="fixed top-0 left-0 right-0 z-50 premium-header">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-2xl tracking-tight text-[var(--ink)]">
              Quittance
            </Link>
            <NetworkBadge />
          </div>
          <nav className="flex items-center gap-3 sm:gap-5">
            <Link
              href="/dashboard"
              className="hidden sm:inline text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              Dashboard
            </Link>
            {!connected ? (
              <WalletConnect
                onConnect={handleWalletConnected}
                onConnectionFailure={handleWalletConnectionFailure}
              />
            ) : (
              <UserProfile userWallet={publicKey} onDisconnect={handleWalletDisconnected} />
            )}
          </nav>
        </div>
      </header>

      {/* Hero — one composition */}
      <section className="relative min-h-[100svh] flex flex-col justify-center hero-atmosphere overflow-hidden">
        <div className="hero-grain" aria-hidden />
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-24 pb-20 w-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-display text-[clamp(3.5rem,12vw,8.5rem)] leading-[0.9] tracking-tight text-[var(--ink)] max-w-4xl">
              Quittance
            </p>
          </motion.div>

          <motion.p
            className="mt-8 max-w-md text-lg sm:text-xl text-[var(--muted)] leading-relaxed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            Invoice on Stellar. Get paid. Keep the proof.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {connected ? (
              <button type="button" onClick={scrollToCreate} className="btn btn-primary px-7 py-3">
                Create invoice
              </button>
            ) : (
              <WalletConnect
                onConnect={handleWalletConnected}
                onConnectionFailure={handleWalletConnectionFailure}
              />
            )}
            <Link href="/dashboard" className="btn btn-outline px-7 py-3">
              Dashboard
            </Link>
          </motion.div>
          {!connected && showFreighterGuidance && (
            <motion.div
              className="mt-5 max-w-md"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <FreighterInstallGuidance />
            </motion.div>
          )}
        </div>
      </section>

      {/* How it works — editorial, no cards */}
      <section className="border-t border-[var(--line)] bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <motion.h2
            className="font-display text-3xl sm:text-4xl text-[var(--ink)] mb-14"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            How it works
          </motion.h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10">
            {[
              {
                n: '01',
                title: 'Create',
                body: 'Connect Freighter and issue an invoice. Share the link or QR with your client.',
              },
              {
                n: '02',
                title: 'Get paid',
                body: 'They pay on Stellar. We match memo, amount, and destination on Horizon.',
              },
              {
                n: '03',
                title: 'Keep proof',
                body: 'Download your quittance as PDF, or email it when a client address is set.',
              },
            ].map((step, i) => (
              <motion.li
                key={step.n}
                className="border-t border-[var(--ink)] pt-6"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
              >
                <span className="text-xs tracking-[0.2em] text-[var(--teal)] font-medium">
                  {step.n}
                </span>
                <h3 className="mt-3 font-display text-2xl text-[var(--ink)]">{step.title}</h3>
                <p className="mt-3 text-[var(--muted)] leading-relaxed text-[15px]">{step.body}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* Create — interaction surface */}
      <section id="create" className="border-t border-[var(--line)] bg-[var(--paper)]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="mb-12 max-w-xl">
            <h2 className="font-display text-3xl sm:text-4xl text-[var(--ink)]">Create an invoice</h2>
            <p className="mt-3 text-[var(--muted)]">
              Payments go to your connected wallet. Client email is optional — only for sending the link.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div className="card">
              {!connected ? (
                <div className="py-8 text-center">
                  <p className="font-display text-2xl text-[var(--ink)] mb-3">Connect Freighter</p>
                  <p className="text-[var(--muted)] text-sm mb-8 max-w-sm mx-auto">
                    Your wallet is your identity. No Google account required.
                  </p>
                  <div className="flex justify-center">
                    <WalletConnect
                      onConnect={handleWalletConnected}
                      onConnectionFailure={handleWalletConnectionFailure}
                    />
                  </div>
                  {showFreighterGuidance && (
                    <div className="mt-5 max-w-sm mx-auto">
                      <FreighterInstallGuidance />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-xs text-[var(--muted)] mb-1">Receiving to</p>
                  <p className="font-mono text-xs text-[var(--ink)] mb-6 break-all">{publicKey}</p>
                  <InvoiceForm onSuccess={handleInvoiceCreated} userWallet={publicKey || undefined} />
                </>
              )}
            </div>

            <div>
              {createdInvoice ? (
                <div className="card space-y-5">
                  <div>
                    <p className="text-xs tracking-wide text-[var(--teal)] font-medium uppercase">
                      Ready to share
                    </p>
                    <h3 className="font-display text-2xl mt-1">Invoice created</h3>
                  </div>

                  <div className="flex justify-center py-4 bg-[var(--paper)] rounded-md border border-[var(--line)]">
                    <QRCodeDisplay
                      value={createdInvoice.paymentUrl}
                      title="Scan to pay"
                      size={180}
                    />
                  </div>

                  <div className="flex items-baseline gap-3">
                    <AssetLogo code={createdInvoice.invoice.assetCode} size={28} showName={false} priority={true} />
                    <span className="font-display text-4xl">
                      {createdInvoice.invoice.amount}
                    </span>
                    <span className="text-[var(--teal)] font-medium">
                      {createdInvoice.invoice.assetCode}
                    </span>
                  </div>

                  {createdInvoice.invoice.description && (
                    <p className="text-sm text-[var(--muted)]">{createdInvoice.invoice.description}</p>
                  )}

                  {(createdInvoice.invoice.customerName || createdInvoice.invoice.customerEmail) && (
                    <div className="text-sm space-y-1 border-t border-[var(--line)] pt-4">
                      {createdInvoice.invoice.customerName && (
                        <p>
                          <span className="text-[var(--muted)]">Client · </span>
                          {createdInvoice.invoice.customerName}
                        </p>
                      )}
                      {createdInvoice.invoice.customerEmail && (
                        <p>
                          <span className="text-[var(--muted)]">Email · </span>
                          {createdInvoice.invoice.customerEmail}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="font-mono text-[11px] break-all text-[var(--muted)] bg-[var(--ink)] text-white/90 p-3 rounded-md">
                    {createdInvoice.paymentUrl}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(createdInvoice.paymentUrl);
                        toast.success('Link copied');
                      }}
                      className="btn btn-primary flex-1"
                    >
                      Copy link
                    </button>
                    {createdInvoice.invoice.customerEmail && (
                      <button
                        type="button"
                        onClick={() => {
                          shareInvoiceByEmail(createdInvoice.invoice);
                          toast.success('Opening email');
                        }}
                        className="btn btn-secondary"
                      >
                        <Mail className="w-4 h-4" />
                        Send
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCreatedInvoice(null)}
                      className="btn btn-outline"
                    >
                      New
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-[var(--line)] rounded-lg p-10 text-center min-h-[280px] flex flex-col items-center justify-center">
                  <p className="font-display text-xl text-[var(--ink)]">Payment link appears here</p>
                  <p className="mt-2 text-sm text-[var(--muted)] max-w-xs">
                    After you create an invoice, the QR and URL show up for sharing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 flex flex-col sm:flex-row sm:items-end justify-between gap-8">
          <div>
            <p className="font-display text-2xl">Quittance</p>
            <p className="mt-2 text-sm text-[var(--muted)] max-w-xs">
              Stellar invoices with downloadable payment proof.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-[var(--muted)]">
            <Link href="/dashboard" className="hover:text-[var(--ink)]">
              Dashboard
            </Link>
            <a href="https://www.stellar.org" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--ink)]">
              Stellar
            </a>
            <a href="https://stellar.expert/explorer/testnet" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--ink)]">
              Explorer
            </a>
          </div>
        </div>
        <div className="border-t border-[var(--line)]">
          <p className="max-w-6xl mx-auto px-5 sm:px-8 py-4 text-xs text-[var(--muted)]">
            © {new Date().getFullYear()} Quittance
          </p>
        </div>
      </footer>
    </div>
  );
}
