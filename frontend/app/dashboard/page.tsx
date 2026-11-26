'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { importInvoiceBackup, invoiceApi } from '@/lib/api';
import InvoiceCard from '@/components/InvoiceCard';
import InvoiceBackupExport from '@/components/InvoiceBackupExport';
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
  BellRing,
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadAllInvoicesCSV, downloadPaidInvoiceCSV } from '@/lib/export';
import { invoiceStatusLabel } from '@/lib/invoiceStatusLabel';
import { getInvoiceReminder } from '@/lib/mailtoProof';

const PAGE_SIZE = 50;

export default function DashboardPage() {
  const { publicKey, connected } = useWalletStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState<'paid' | 'all' | 'json' | null>(null);
  const [importing, setImporting] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [assetCode, setAssetCode] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'invoices' | 'transactions'>('invoices');
  const loadRequestId = useRef(0);
  const importInput = useRef<HTMLInputElement>(null);
  const [cursorStack, setCursorStack] = useState<Array<string | undefined>>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [paymentOrigin, setPaymentOrigin] = useState('');
  // The wallet whose invoices the dashboard is currently allowed to show.
  // In-flight responses for a previous Freighter account are dropped.
  const activeSeller = useRef<string | null>(publicKey ?? null);

  useEffect(() => {
    setPaymentOrigin(window.location.origin);
  }, []);

  const loadPage = useCallback(async (cursor?: string) => {
    if (!publicKey) return;
    const sellerPublicKey = publicKey;
    const requestId = ++loadRequestId.current;
    try {
      setLoading(true);
      setLoadError(false);
      const [invoicesResult, statsResult] = await Promise.all([
        invoiceApi.getAll({
          status: filter === 'all' ? undefined : filter.toUpperCase(),
          assetCode: assetCode || undefined,
          createdFrom: createdFrom || undefined,
          createdTo: createdTo || undefined,
          limit: PAGE_SIZE,
          sellerPublicKey: publicKey,
          cursor,
          search: searchQuery || undefined,
        }),
        invoiceApi.getStats(publicKey),
      ]);
      if (
        requestId === loadRequestId.current &&
        sellerPublicKey === activeSeller.current
      ) {
        setInvoices(
          invoicesResult.data.filter(
            (invoice: any) => invoice?.sellerPublicKey === sellerPublicKey,
          ),
        );
        setStats(statsResult.data[0] || {});
        setNextCursor(invoicesResult.pagination?.nextCursor);
      }
    } catch (error) {
      if (
        requestId === loadRequestId.current &&
        sellerPublicKey === activeSeller.current
      ) {
        setLoadError(true);
        toast.error('Failed to load data');
      }
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  }, [assetCode, createdFrom, createdTo, filter, publicKey, searchQuery]);

  useEffect(() => {
    activeSeller.current = publicKey;

    if (!connected || !publicKey) {
      loadRequestId.current += 1;
      setInvoices([]);
      setStats(null);
      setLoading(false);
      setLoadError(false);
      setCursorStack([undefined]);
      setPageIndex(0);
      setNextCursor(undefined);
      return;
    }
    // Switching Freighter accounts must not leave the previous wallet's
    // invoices on screen: drop them and any in-flight response, then reload.
    loadRequestId.current += 1;
    setInvoices([]);
    setStats(null);
    setLoading(true);
    setLoadError(false);
    // A new seller, status filter or search always starts from the first page.
    setCursorStack([undefined]);
    setPageIndex(0);
    setNextCursor(undefined);
    loadPage(undefined);
  }, [connected, publicKey, filter, loadPage]);

  useEffect(() => {
    if (!connected || !publicKey) return;
    const intervalId = setInterval(() => {
      void loadPage(cursorStack[pageIndex]);
    }, 3000);
    return () => clearInterval(intervalId);
  }, [connected, publicKey, cursorStack, pageIndex, loadPage]);

  // Filter and search the invoices on the current page
  useEffect(() => {
    const trimmed = searchInput.trim();
    const timer = setTimeout(() => {
      setSearchQuery(trimmed.length >= 2 ? trimmed : '');
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleNextPage = () => {
    if (!nextCursor) return;
    const nextIndex = pageIndex + 1;
    setCursorStack((prev) => {
      const stack = [...prev];
      stack[nextIndex] = nextCursor;
      return stack;
    });
    setPageIndex(nextIndex);
    loadPage(nextCursor);
  };

  const handlePreviousPage = () => {
    if (pageIndex === 0) return;
    const previousIndex = pageIndex - 1;
    setPageIndex(previousIndex);
    loadPage(cursorStack[previousIndex]);
  };

  const loadInvoicesForExport = async (status?: string) => {
    if (!publicKey) return [];

    const exported: any[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | undefined;

    do {
      const result = await invoiceApi.getAll({
        status,
        limit: PAGE_SIZE,
        sellerPublicKey: publicKey,
        cursor,
      });

      if (!Array.isArray(result.data)) {
        throw new Error('Invoice export returned an invalid page');
      }

      exported.push(
        ...result.data.filter((invoice: any) => invoice?.sellerPublicKey === publicKey),
      );

      cursor = result.pagination?.nextCursor;
      if (cursor && seenCursors.has(cursor)) {
        throw new Error('Invoice export pagination did not advance');
      }
      if (cursor) seenCursors.add(cursor);
    } while (cursor);

    return exported;
  };

  const handleExportCSV = async (type: 'paid' | 'all') => {
    if (!publicKey || exporting !== null) return;

    setExporting(type);
    try {
      const status = type === 'paid' ? 'PAID' : undefined;
      const exported = await loadInvoicesForExport(status);

      if (type === 'paid') {
        const paid = exported.filter((invoice) => invoice.status === 'PAID');
        downloadPaidInvoiceCSV(paid, publicKey);
        toast.success(`Exported ${paid.length} paid invoices to CSV`);
      } else {
        downloadAllInvoicesCSV(exported, publicKey);
        toast.success(`Exported ${exported.length} invoices to CSV`);
      }
    } catch (error) {
      console.error('Invoice CSV export failed:', error);
      toast.error('Failed to export invoices');
    } finally {
      setExporting(null);
    }
  };

  // Search and status filtering happen on the server, so the page's rows are
  // already the filtered set.
  const filteredInvoices = invoices;

  const hasActiveFilters =
    filter !== 'all' ||
    assetCode !== '' ||
    createdFrom !== '' ||
    createdTo !== '' ||
    searchQuery.trim() !== '';

  const clearFilters = () => {
    setFilter('all');
    setAssetCode('');
    setCreatedFrom('');
    setCreatedTo('');
    setSearchInput('');
    setSearchQuery('');
  };

  const handleExportJSON = async () => {
    if (!publicKey) return;
    setExporting('json');
    try {
      const backup: any[] = [];
      let cursor: string | undefined;
      do {
        const result = await invoiceApi.getAll({ sellerPublicKey: publicKey, limit: 100, cursor });
        backup.push(...result.data);
        cursor = result.pagination?.nextCursor;
      } while (cursor);
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `quittance-invoices-${publicKey.slice(0, 8)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Backed up ${backup.length} invoices`);
    } catch {
      toast.error('Failed to export invoice backup');
    } finally {
      setExporting(null);
    }
  };

  const handleImportJSON = async (file?: File) => {
    if (!file || !publicKey) return;
    setImporting(true);
    try {
      const backup = JSON.parse(await file.text());
      const result = await importInvoiceBackup(publicKey, backup);
      const skipped = result.data.skippedIds.length;
      toast.success(`Imported ${result.data.imported} invoices; skipped ${skipped} existing IDs`);
      setCursorStack([undefined]);
      setPageIndex(0);
      await loadPage(undefined);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Invalid invoice backup');
    } finally {
      if (importInput.current) importInput.current.value = '';
      setImporting(false);
    }
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
            <Link
              href="/"
              className="btn btn-primary flex items-center gap-2"
              aria-label="New Invoice"
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
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
              aria-pressed={viewMode === 'invoices'}
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
              aria-pressed={viewMode === 'transactions'}
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

            <InvoiceBackupExport key={publicKey} sellerPublicKey={publicKey!} />

            <div className="flex gap-3 mb-4">
              <div className="card flex-1 mb-0">
                <label htmlFor="invoice-search" className="label">Search invoices</label>
                <input
                  id="invoice-search"
                  type="text"
                  placeholder="Search invoices..."
                  aria-label="Search invoices"
                  className="input w-full"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput.trim().length === 1 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Type at least 2 characters to search.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleExportCSV('paid')}
                disabled={exporting !== null}
                className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
                title="Export paid invoices"
                aria-label="Export paid CSV"
              >
                <Download className="w-5 h-5" aria-hidden="true" />
                <span className="hidden sm:inline">{exporting === 'paid' ? 'Exporting…' : 'Export Paid CSV'}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleExportCSV('all')}
                disabled={exporting !== null}
                className="btn btn-outline flex items-center gap-2 whitespace-nowrap"
                title="Export all invoices"
                aria-label="Export all CSV"
              >
                <Download className="w-5 h-5" aria-hidden="true" />
                <span className="hidden sm:inline">{exporting === 'all' ? 'Exporting…' : 'Export All CSV'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                disabled={exporting !== null}
                className="btn btn-primary whitespace-nowrap"
              >
                {exporting === 'json' ? 'Exporting...' : 'Back up JSON'}
              </button>
              <input
                ref={importInput}
                type="file"
                accept=".json,application/json"
                aria-label="Import invoice JSON backup"
                disabled={importing}
                onChange={(event) => handleImportJSON(event.target.files?.[0])}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => importInput.current?.click()}
                disabled={importing}
                className="btn btn-primary whitespace-nowrap"
              >
                {importing ? 'Importing...' : 'Import JSON'}
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 mb-6 p-2 flex gap-2 flex-wrap">
              {['all', 'pending', 'paid', 'expired', 'cancelled', 'uncollectible'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  aria-pressed={filter === status}
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

            <div className="card mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <label className="text-sm font-medium text-gray-700">
                Asset code
                <input
                  type="text"
                  value={assetCode}
                  onChange={(event) => setAssetCode(event.target.value.trim().toUpperCase())}
                  placeholder="Any asset"
                  aria-label="Filter by asset code"
                  className="input mt-1 w-full"
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Created from
                <input
                  type="date"
                  value={createdFrom}
                  onChange={(event) => setCreatedFrom(event.target.value)}
                  aria-label="Created from"
                  className="input mt-1 w-full"
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Created to
                <input
                  type="date"
                  value={createdTo}
                  onChange={(event) => setCreatedTo(event.target.value)}
                  aria-label="Created to"
                  className="input mt-1 w-full"
                />
              </label>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn btn-outline self-end"
                >
                  Clear filters
                </button>
              )}
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
                  onClick={() => loadPage(cursorStack[pageIndex])}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" aria-hidden="true" />
                  Try again
                </button>
              </div>
            ) : invoices.length === 0 ? (
              <div className="card text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {hasActiveFilters ? 'No matching invoices' : 'No invoices yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {hasActiveFilters
                    ? 'Try adjusting or clearing your filters.'
                    : 'Create your first invoice to start tracking payments.'}
                </p>
                {!hasActiveFilters && (
                  <Link href="/" className="btn btn-primary inline-flex items-center gap-2">
                    <Plus className="w-5 h-5" aria-hidden="true" />
                    Create invoice
                  </Link>
                )}
              </div>
            ) : (
              <>
                {searchQuery && (
                  <div className="mb-4 text-sm text-gray-600">
                    Found {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} for “{searchQuery}”
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {invoices.map((invoice) => {
                    const reminder = getInvoiceReminder(
                      invoice,
                      paymentOrigin ? `${paymentOrigin}/pay/${invoice.id}` : '',
                    );

                    return (
                      <div key={invoice.id} className="space-y-2">
                        {reminder.dueSoon && (
                          <div
                            className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                            role="status"
                          >
                            <span className="inline-flex items-center gap-2 font-medium">
                              <BellRing className="h-4 w-4" aria-hidden="true" />
                              Expires within 24 hours
                            </span>
                            {reminder.mailto && (
                              <a
                                href={reminder.mailto}
                                className="font-semibold underline underline-offset-2"
                                aria-label={`Remind ${invoice.customerEmail} about invoice ${invoice.id}`}
                              >
                                Remind
                              </a>
                            )}
                          </div>
                        )}
                        <InvoiceCard invoice={invoice} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="flex items-center justify-between gap-3 mt-6">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={pageIndex === 0 || loading}
                className="btn inline-flex items-center gap-2"
                aria-label="Previous page"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600" aria-live="polite">
                Page {pageIndex + 1}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={!nextCursor || loading}
                className="btn btn-primary inline-flex items-center gap-2"
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </>
        )}
          </>
        )}
      </div>

      </div>
    </div>
  );
}
