'use client';

import { useCallback, useEffect, useState } from 'react';
import { invoiceApi } from '@/lib/api';
import InvoiceCard from '@/components/InvoiceCard';
import WalletConnect from '@/components/WalletConnect';
import UserProfile from '@/components/UserProfile';
import TransactionHistory from '@/components/TransactionHistory';
import { useWalletStore } from '@/lib/store';
import NetworkBadge from '@/components/NetworkBadge';
import Link from 'next/link';
import {
  AlertCircle,
  Plus,
  TrendingUp,
  DollarSign,
  FileText,
  Download,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadInvoiceCSV } from '@/lib/export';
import { invoiceStatusLabel } from '@/lib/invoiceStatusLabel';

export default function DashboardPage() {
  const { publicKey, connected } = useWalletStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredInvoices, setFilteredInvoices] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'invoices' | 'transactions'>('invoices');

  const loadData = useCallback(async () => {
    if (!publicKey) return;
    try {
      setLoading(true);
      setLoadError(false);
      const [invoicesResult, statsResult] = await Promise.all([
        invoiceApi.getAll({
          status: filter === 'all' ? undefined : filter.toUpperCase(),
          limit: 50,
          sellerPublicKey: publicKey,
        }),
        invoiceApi.getStats(publicKey),
      ]);
      setInvoices(invoicesResult.data);
      setStats(statsResult.data[0] || {});
    } catch (error) {
      setLoadError(true);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filter, publicKey]);

  useEffect(() => {
    if (!connected || !publicKey) {
      setInvoices([]);
      setStats(null);
      setLoading(false);
      setLoadError(false);
      return;
    }
    loadData();
  }, [connected, publicKey, loadData]);

  // Filter and search invoices
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInvoices(invoices);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = invoices.filter((invoice) => {
      return (
        invoice.id.toLowerCase().includes(query) ||
        invoice.memo.toLowerCase().includes(query) ||
        invoice.description?.toLowerCase().includes(query) ||
        invoice.customerName?.toLowerCase().includes(query) ||
        invoice.customerEmail?.toLowerCase().includes(query) ||
        invoice.amount.toString().includes(query)
      );
    });
    setFilteredInvoices(filtered);
  }, [searchQuery, invoices]);

  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error('No invoices to export');
      return;
    }
    downloadInvoiceCSV(filteredInvoices as any);
    toast.success(`Exported ${filteredInvoices.length} invoices to CSV`);
  };

  return (
    <div className="min-h-screen bg-logo-pattern relative">
      <div className="accent-blob accent-blob-1"></div>
      <div className="accent-blob accent-blob-2"></div>
      <header className="fixed top-0 left-0 right-0 z-50 premium-header border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-xl tracking-tight text-[var(--ink)] hover:opacity-80 transition-opacity">
              Quittance
            </Link>
            <NetworkBadge />
          </div>
          <div className="flex items-center gap-3">
            {!connected ? (
              <WalletConnect />
            ) : (
              <UserProfile userWallet={publicKey} onDisconnect={() => {
                window.location.reload();
              }} />
            )}
            <Link href="/" className="btn btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Invoice</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        {!connected || !publicKey ? (
          <div className="card text-center py-16 max-w-lg mx-auto">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect your wallet</h2>
            <p className="text-gray-600 mb-6">
              Dashboard shows only invoices for your connected Freighter wallet.
            </p>
            <div className="flex justify-center">
              <WalletConnect />
            </div>
          </div>
        ) : (
          <>
        {connected && publicKey && (
          <div className="bg-white rounded-lg border border-gray-200 mb-6 p-2 flex gap-2">
            <button
              onClick={() => setViewMode('invoices')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === 'invoices'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Invoices
            </button>
            <button
              onClick={() => setViewMode('transactions')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === 'transactions'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Transactions
            </button>
          </div>
        )}

        {connected && publicKey && viewMode === 'transactions' && (
          <div className="space-y-6">
            <TransactionHistory publicKey={publicKey} limit={50} />
          </div>
        )}

        {viewMode === 'invoices' && (
          <>
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_invoices || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.paid_invoices || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.pending_invoices || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {parseFloat(stats.total_revenue || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">{stats.asset_code || 'XLM'}</p>
                </div>
              </div>
            </div>
          </div>
            )}

            <div className="flex gap-3 mb-4">
              <div className="card flex-1 mb-0">
                <input
                  type="text"
                  placeholder="Search invoices..."
                  aria-label="Search invoices"
                  className="input w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={handleExportCSV}
                className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
                title="Export displayed invoices"
              >
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 mb-6 p-2 flex gap-2 flex-wrap">
              {['all', 'pending', 'paid', 'expired'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    filter === status
                      ? 'bg-cyan-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {status === 'all' ? 'All' : invoiceStatusLabel(status)}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="card py-10" role="status" aria-live="polite" aria-busy="true">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Loading invoices
                  </h3>
                  <p className="text-gray-600">
                    Fetching invoices for your connected wallet.
                  </p>
                </div>
                <div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse"
                  aria-hidden="true"
                >
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="rounded-lg border border-gray-200 p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="h-6 w-28 rounded bg-gray-200" />
                        <div className="h-6 w-20 rounded-full bg-gray-200" />
                      </div>
                      <div className="h-4 w-full rounded bg-gray-200" />
                      <div className="h-4 w-2/3 rounded bg-gray-200" />
                      <div className="h-10 w-full rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
              </div>
            ) : loadError ? (
              <div className="card text-center py-12" role="alert">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  We couldn&apos;t load your invoices
                </h3>
                <p className="text-gray-600 mb-6">
                  Check your connection and try again. Your invoice data has not been changed.
                </p>
                <button
                  type="button"
                  onClick={loadData}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try again
                </button>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="card text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {searchQuery ? 'No matching invoices' : 'No invoices yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery
                    ? 'Try a different search term.'
                    : 'Create your first invoice to start tracking payments.'}
                </p>
                {!searchQuery && (
                  <Link href="/" className="btn btn-primary inline-flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create invoice
                  </Link>
                )}
              </div>
            ) : (
              <>
                {searchQuery && (
                  <div className="mb-4 text-sm text-gray-600">
                    Found {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredInvoices.map((invoice) => (
                    <InvoiceCard key={invoice.id} invoice={invoice} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
          </>
        )}
      </div>

      </div>
    </div>
  );
}
