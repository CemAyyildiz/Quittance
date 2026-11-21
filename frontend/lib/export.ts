import { format } from 'date-fns';
import type { Transaction } from '@/components/TransactionHistory';
import { csvRow } from '@/lib/csvEscape';
import { mailtoProof } from '@/lib/mailtoProof';

interface Invoice {
  id: string;
  amount: number;
  assetCode: string;
  assetIssuer?: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  sellerName?: string;
  sellerEmail?: string;
  payerName?: string;
  payerEmail?: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  memo: string;
  sellerPublicKey: string;
  payerPublicKey?: string;
  paymentTxHash?: string;
}

/**
 * Convert transactions to CSV format
 */
export function generateCSV(transactions: Transaction[]): string {
  const headers = [
    'Date',
    'Time',
    'Type',
    'Hash',
    'From',
    'To',
    'Amount',
    'Asset',
    'Memo',
    'Ledger',
  ];

  const rows = transactions.map((tx) => [
    format(new Date(tx.createdAt), 'yyyy-MM-dd'),
    format(new Date(tx.createdAt), 'HH:mm:ss'),
    tx.type.toUpperCase(),
    tx.hash,
    tx.from,
    tx.to,
    tx.amount,
    tx.asset_code,
    tx.memo || '',
    tx.ledger.toString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n'),
  ].join('\n');

  return csvContent;
}

/**
 * Escape a value for safe insertion into CSV.
 * Handles commas, quotes, and newlines.
 */
function escapeCSV(value: string | number | null | undefined): string {
  const valueStr = String(value === null || value === undefined ? '' : value);
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (/[",\n]/.test(valueStr)) {
    return '"' + valueStr.replace(/\"/g, '""') + '"';
  }
  return valueStr;
}

/**
 * Generate CSV for invoices (original format - backward compatible).
 * @param invoices - Invoice data
 * @returns CSV string
 */
export function generateInvoiceCSV(invoices: Invoice[]): string {
  const headers = [
    'Invoice ID',
    'Created At',
    'Seller Name',
    'Seller Email',
    'Customer Name',
    'Customer Email',
    'Description',
    'Amount',
    'Asset',
    'Status',
    'Paid At',
    'Payer Name',
    'Payer Email',
    'Expires At',
    'Memo',
    'Transaction Hash',
  ];

  const rows = invoices.map((inv) => [
    inv.id,
    format(new Date(inv.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    inv.sellerName || '',
    inv.sellerEmail || '',
    inv.customerName || '',
    inv.customerEmail || '',
    inv.description || '',
    inv.amount,
    inv.assetCode,
    inv.status,
    inv.paidAt ? format(new Date(inv.paidAt), 'yyyy-MM-dd HH:mm:ss') : '',
    inv.payerName || '',
    inv.payerEmail || '',
    format(new Date(inv.expiresAt), 'yyyy-MM-dd HH:mm:ss'),
    inv.memo,
    inv.status === 'PAID' ? inv.paymentTxHash || '' : '',
  ]);

  return [csvRow(headers), ...rows.map(csvRow)].join('\n');
}

/**
 * Generate CSV for invoices with status filtering.
 * @param invoices - Invoice data
 * @param options - Status filter: 'paid' or 'all'
 * @returns CSV string
 */
export function generateInvoiceCSVFiltered(
  invoices: Invoice[],
  options: { statusFilter: 'paid' | 'all' } = { statusFilter: 'paid' }
): string {
  // Filter based on status
  let filteredInvoices = invoices;
  if (options.statusFilter === 'paid') {
    filteredInvoices = invoices.filter((inv) => inv.status === 'PAID');
  }
  // If 'all', include every status

  const headers = [
    'Invoice ID',
    'Created At',
    'Amount',
    'Asset',
    'Issuer',
    'Memo',
    'Payer',
    'Transaction Hash',
    'Status',
  ];

  const rows = filteredInvoices.map((inv) => [
    inv.id,
    format(new Date(inv.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    inv.amount,
    inv.assetCode,
    inv.assetIssuer || '',
    inv.memo,
    inv.payerPublicKey || '',
    inv.status === 'PAID' ? inv.paymentTxHash || '' : '',
    inv.status,
  ]);

  return [csvRow(headers), ...rows.map(csvRow)].join('\n');
}

/**
 * Download CSV file for invoices (original format).
 * @param invoices - Invoice data
 * @param filename - Optional custom filename
 */
export function downloadInvoiceCSVOriginal(invoices: Invoice[], filename?: string) {
  const csv = generateInvoiceCSV(invoices);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const defaultFilename = `quittance-invoices-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename || defaultFilename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download CSV file for invoices (new format with status filtering).
 * @param invoices - Invoice data
 * @param filename - Optional custom filename
 * @param options - Status filter: 'paid' or 'all'
 */
export function downloadInvoiceCSV(
  invoices: Invoice[],
  filename?: string,
  options?: { statusFilter: 'paid' | 'all' }
) {
  // When options is not provided, use the original format for backward compatibility
  if (!options) {
    downloadInvoiceCSVOriginal(invoices, filename);
    return;
  }
  const csv = generateInvoiceCSVFiltered(invoices, options);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const dateStr = format(new Date(), 'yyyy-MM-dd-HHmmss');
  const defaultFilename = options.statusFilter === 'paid'
    ? `quittance-paid-invoices-${dateStr}.csv`
    : `quittance-all-invoices-${dateStr}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename || defaultFilename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
