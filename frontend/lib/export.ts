import { format } from 'date-fns';
import type { Transaction } from '@/components/TransactionHistory';

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
    tx.assetCode,
    tx.memo || '',
    tx.ledger.toString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(transactions: Transaction[], filename?: string) {
  const csv = generateCSV(transactions);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const defaultFilename = `quittance-transactions-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename || defaultFilename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate PDF content (HTML that can be printed/saved as PDF)
 */
export function generatePDFContent(
  transactions: Transaction[],
  publicKey: string
): string {
  const totalReceived = transactions
    .filter((tx) => tx.type === 'received')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  const totalSent = transactions
    .filter((tx) => tx.type === 'sent')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'TESTNET' ? 'Testnet' : 'Mainnet';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Quittance Transaction History</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', sans-serif;
      padding: 40px;
      color: #1f2937;
      background: white;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #4f46e5;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #4f46e5;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #6b7280;
      font-size: 14px;
    }
    .info-section {
      margin-bottom: 30px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
    }
    .info-value {
      font-family: monospace;
      color: #1f2937;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      padding: 20px;
      background: #f3f4f6;
      border-radius: 8px;
      text-align: center;
    }
    .summary-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .summary-value {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #4f46e5;
      color: white;
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
    }
    td {
      padding: 12px 8px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 12px;
    }
    tr:hover {
      background: #f9fafb;
    }
    .type-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .type-received {
      background: #d1fae5;
      color: #065f46;
    }
    .type-sent {
      background: #dbeafe;
      color: #1e40af;
    }
    .amount-received {
      color: #059669;
      font-weight: 600;
    }
    .amount-sent {
      color: #1f2937;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 12px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .address {
      font-family: monospace;
      font-size: 10px;
      word-break: break-all;
    }
    @media print {
      body {
        padding: 20px;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">💫 Quittance</div>
    <div class="subtitle">Transaction History Report</div>
  </div>

  <div class="info-section">
    <div class="info-row">
      <span class="info-label">Account Address:</span>
      <span class="info-value address">${publicKey}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Network:</span>
      <span class="info-value">${network}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Report Date:</span>
      <span class="info-value">${format(new Date(), 'PPpp')}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Total Transactions:</span>
      <span class="info-value">${transactions.length}</span>
    </div>
  </div>

  <div class="summary">
    <div class="summary-card">
      <div class="summary-label">Total Received</div>
      <div class="summary-value amount-received">+${totalReceived.toFixed(2)} XLM</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Total Sent</div>
      <div class="summary-value amount-sent">-${totalSent.toFixed(2)} XLM</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Net Balance</div>
      <div class="summary-value">${(totalReceived - totalSent).toFixed(2)} XLM</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date & Time</th>
        <th>Type</th>
        <th>From/To</th>
        <th>Amount</th>
        <th>Asset</th>
        <th>Memo</th>
        <th>Hash</th>
      </tr>
    </thead>
    <tbody>
      ${transactions
        .map(
          (tx) => `
        <tr>
          <td>${format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm')}</td>
          <td>
            <span class="type-badge type-${tx.type}">
              ${tx.type === 'received' ? '↓ Received' : '↑ Sent'}
            </span>
          </td>
          <td class="address">
            ${tx.type === 'received' ? tx.from : tx.to}
          </td>
          <td class="amount-${tx.type}">
            ${tx.type === 'received' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
          </td>
          <td>${tx.assetCode}</td>
          <td>${tx.memo || '-'}</td>
          <td class="address">${tx.hash.substring(0, 16)}...</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Generated by Quittance - Stellar Payment Platform</p>
    <p>This is an automatically generated report. All transactions are recorded on the Stellar blockchain.</p>
  </div>

  <div class="no-print" style="position: fixed; top: 10px; right: 10px; background: #06b6d4; color: white; padding: 15px; border-radius: 8px; z-index: 1000; max-width: 300px; font-family: Arial, sans-serif;">
    <h3 style="margin: 0 0 10px 0; font-size: 14px;">To save as PDF:</h3>
    <ol style="margin: 0; padding-left: 20px; font-size: 12px;">
      <li>Press Ctrl+P (Windows) or Cmd+P (Mac)</li>
      <li>Choose “Save as PDF” as the destination</li>
      <li>Click "Print"</li>
    </ol>
    <button onclick="window.print()" style="background: white; color: #06b6d4; border: none; padding: 8px 16px; border-radius: 4px; margin-top: 10px; cursor: pointer; font-weight: bold; font-size: 12px;">
      Save as PDF
    </button>
  </div>

</body>
</html>
  `;
}

/**
 * Download PDF directly
 */
export function downloadPDF(transactions: Transaction[], publicKey: string, filename?: string) {
  const pdfContent = generatePDFContent(transactions, publicKey);
  
  // Open in new window for PDF printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    
    // Auto-trigger print dialog after content loads
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
}

/**
 * Download JSON format (for backup/data portability)
 */
export function downloadJSON(transactions: Transaction[], filename?: string) {
  const json = JSON.stringify(transactions, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const defaultFilename = `quittance-transactions-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename || defaultFilename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

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

export function generateInvoiceCSV(invoices: Invoice[]): string {
  const headers = [
    'Invoice ID',
    'Date',
    'Seller Name',
    'Seller Email',
    'Customer Name',
    'Customer Email',
    'Description',
    'Amount',
    'Asset',
    'Status',
    'Payment Date',
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
    inv.paymentTxHash || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

export function downloadInvoiceCSV(invoices: Invoice[], filename?: string) {
  const csv = generateInvoiceCSV(invoices);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const defaultFilename = `invoices-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename || defaultFilename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateInvoicePDF(invoice: Invoice): string {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'TESTNET' ? 'Testnet' : 'Mainnet';
  const isPaid = invoice.status === 'PAID';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      padding: 20px; 
      color: #333; 
      background: white; 
      font-size: 14px;
      line-height: 1.4;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 30px; 
      padding-bottom: 15px; 
      border-bottom: 2px solid #06b6d4; 
    }
    .logo { 
      font-size: 24px; 
      font-weight: bold; 
      color: #06b6d4; 
    }
    .invoice-title { 
      text-align: right; 
    }
    .invoice-title h1 { 
      font-size: 28px; 
      color: #333; 
      margin-bottom: 5px; 
    }
    .invoice-number { 
      color: #666; 
      font-size: 12px; 
    }
    .status-badge { 
      display: inline-block; 
      padding: 4px 8px; 
      border-radius: 4px; 
      font-size: 10px; 
      font-weight: 600; 
      text-transform: uppercase; 
      margin-top: 8px; 
    }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-expired { background: #fee2e2; color: #991b1b; }
    .info-grid { 
      display: flex; 
      gap: 20px; 
      margin-bottom: 30px; 
    }
    .info-section { 
      flex: 1;
      padding: 15px; 
      background: #f9fafb; 
      border-radius: 6px; 
    }
    .info-section h3 { 
      font-size: 12px; 
      color: #666; 
      text-transform: uppercase; 
      margin-bottom: 10px; 
      letter-spacing: 0.5px; 
    }
    .info-row { 
      margin-bottom: 8px; 
    }
    .info-label { 
      font-size: 10px; 
      color: #666; 
      margin-bottom: 2px; 
    }
    .info-value { 
      font-size: 12px; 
      color: #333; 
      font-weight: 500; 
    }
    .amount-section { 
      background: #06b6d4; 
      padding: 20px; 
      border-radius: 8px; 
      text-align: center; 
      margin-bottom: 20px; 
    }
    .amount-label { 
      color: white; 
      font-size: 12px; 
      margin-bottom: 8px; 
    }
    .amount-value { 
      font-size: 36px; 
      font-weight: bold; 
      color: white; 
      margin-bottom: 5px; 
    }
    .amount-asset { 
      color: white; 
      font-size: 16px; 
      font-weight: 600; 
    }
    .details-table { 
      width: 100%; 
      margin-bottom: 20px; 
    }
    .details-table tr { 
      border-bottom: 1px solid #e5e7eb; 
    }
    .details-table td { 
      padding: 8px 0; 
    }
    .details-table td:first-child { 
      color: #666; 
      font-size: 11px; 
      width: 30%; 
    }
    .details-table td:last-child { 
      color: #333; 
      font-size: 12px; 
      font-weight: 500; 
    }
    .footer { 
      margin-top: 30px; 
      padding-top: 15px; 
      border-top: 1px solid #e5e7eb; 
      text-align: center; 
      color: #666; 
      font-size: 10px; 
    }
    .blockchain-info { 
      background: #fef3c7; 
      padding: 10px; 
      border-radius: 6px; 
      margin-bottom: 15px; 
      border-left: 3px solid #f59e0b; 
    }
    .blockchain-info p {
      font-size: 10px;
      color: #92400e;
      line-height: 1.4;
    }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Quittance</div>
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <div class="invoice-number">#${invoice.id.substring(0, 8).toUpperCase()}</div>
      <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-section">
      <h3>Bill To</h3>
      ${invoice.customerName ? `<div class="info-row"><div class="info-label">Customer Name</div><div class="info-value">${invoice.customerName}</div></div>` : ''}
      ${invoice.customerEmail ? `<div class="info-row"><div class="info-label">Email</div><div class="info-value">${invoice.customerEmail}</div></div>` : ''}
      ${!invoice.customerName && !invoice.customerEmail ? `<div class="info-value">N/A</div>` : ''}
    </div>

    <div class="info-section">
      <h3>Invoice Details</h3>
      <div class="info-row">
        <div class="info-label">Issue Date</div>
        <div class="info-value">${format(new Date(invoice.createdAt), 'MMM dd, yyyy')}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Expires</div>
        <div class="info-value">${format(new Date(invoice.expiresAt), 'MMM dd, yyyy')}</div>
      </div>
      ${isPaid ? `<div class="info-row"><div class="info-label">Payment Date</div><div class="info-value">${format(new Date(invoice.paidAt!), 'MMM dd, yyyy HH:mm')}</div></div>` : ''}
    </div>
  </div>

  ${invoice.sellerName || invoice.sellerEmail ? `
  <div class="info-section" style="margin-bottom: 20px;">
    <h3>Seller Information</h3>
    ${invoice.sellerName ? `<div class="info-row"><div class="info-label">Name</div><div class="info-value">${invoice.sellerName}</div></div>` : ''}
    ${invoice.sellerEmail ? `<div class="info-row"><div class="info-label">Email</div><div class="info-value">${invoice.sellerEmail}</div></div>` : ''}
  </div>` : ''}

  ${isPaid && (invoice.payerName || invoice.payerEmail) ? `
  <div class="info-section" style="margin-bottom: 20px;">
    <h3>Payer Information</h3>
    ${invoice.payerName ? `<div class="info-row"><div class="info-label">Name</div><div class="info-value">${invoice.payerName}</div></div>` : ''}
    ${invoice.payerEmail ? `<div class="info-row"><div class="info-label">Email</div><div class="info-value">${invoice.payerEmail}</div></div>` : ''}
  </div>` : ''}

  <div class="amount-section">
    <div class="amount-label">Amount ${isPaid ? 'Paid' : 'Due'}</div>
    <div class="amount-value">${invoice.amount}</div>
    <div class="amount-asset">${invoice.assetCode}</div>
  </div>

  ${invoice.description ? `<div class="info-section" style="margin-bottom: 20px;"><h3>Description</h3><p style="color: #1f2937; line-height: 1.6;">${invoice.description}</p></div>` : ''}

  <table class="details-table">
    <tr><td>Invoice ID</td><td style="font-family: monospace; font-size: 12px;">${invoice.id}</td></tr>
    <tr><td>Memo</td><td style="font-family: monospace;">${invoice.memo}</td></tr>
    <tr><td>Seller Address</td><td style="font-family: monospace; font-size: 11px; word-break: break-all;">${invoice.sellerPublicKey}</td></tr>
    ${isPaid && invoice.paymentTxHash ? `
    <tr><td>Transaction Hash</td><td style="font-family: monospace; font-size: 11px; word-break: break-all;">${invoice.paymentTxHash}</td></tr>
    <tr><td>Payer Address</td><td style="font-family: monospace; font-size: 11px; word-break: break-all;">${invoice.payerPublicKey || 'N/A'}</td></tr>
    ${invoice.payerName ? `<tr><td>Payer Name</td><td>${invoice.payerName}</td></tr>` : ''}
    ${invoice.payerEmail ? `<tr><td>Payer Email</td><td>${invoice.payerEmail}</td></tr>` : ''}` : ''}
    <tr><td>Network</td><td>${network}</td></tr>
  </table>

  ${isPaid ? `<div class="blockchain-info"><p><strong>Payment Verified</strong></p><p>This payment has been verified and recorded on the Stellar blockchain.</p></div>` : ''}

  <div class="footer">
    <p><strong>Quittance</strong> - Stellar Payment Platform</p>
    <p>Generated on ${format(new Date(), 'PPpp')}</p>
    <p style="margin-top: 10px;">This is an automatically generated invoice.</p>
  </div>

  <div class="no-print" style="position: fixed; top: 10px; right: 10px; background: #06b6d4; color: white; padding: 15px; border-radius: 8px; z-index: 1000; max-width: 300px; font-family: Arial, sans-serif;">
    <h3 style="margin: 0 0 10px 0; font-size: 14px;">To save as PDF:</h3>
    <ol style="margin: 0; padding-left: 20px; font-size: 12px;">
      <li>Press Ctrl+P (Windows) or Cmd+P (Mac)</li>
      <li>Choose “Save as PDF” as the destination</li>
      <li>Click "Print"</li>
    </ol>
    <button onclick="window.print()" style="background: white; color: #06b6d4; border: none; padding: 8px 16px; border-radius: 4px; margin-top: 10px; cursor: pointer; font-weight: bold; font-size: 12px;">
      Save as PDF
    </button>
  </div>

</body>
</html>`;
}

export function openInvoicePDF(invoice: Invoice) {
  const pdfContent = generateInvoicePDF(invoice);
  
  // Open in new window for PDF printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    
    // Auto-trigger print dialog after content loads
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
}

export function shareInvoiceByEmail(invoice: Invoice) {
  if (!invoice.customerEmail) {
    throw new Error('Client email is required to send this invoice');
  }

  const subject = `Invoice #${invoice.id.substring(0, 8).toUpperCase()} - ${invoice.amount} ${invoice.assetCode}`;
  const isPaid = invoice.status === 'PAID';
  
  let body = `Invoice Details:\n`;
  body += `Invoice ID: ${invoice.id}\n`;
  body += `Amount: ${invoice.amount} ${invoice.assetCode}\n`;
  body += `Status: ${invoice.status}\n`;
  
  if (invoice.customerName) body += `Client: ${invoice.customerName}\n`;
  if (invoice.description) body += `Description: ${invoice.description}\n`;
  
  if (isPaid && invoice.paymentTxHash) {
    body += `\nPayment Information:\n`;
    body += `Payment Date: ${format(new Date(invoice.paidAt!), 'PPpp')}\n`;
    body += `Transaction Hash: ${invoice.paymentTxHash}\n`;
    if (invoice.payerPublicKey) body += `Payer Address: ${invoice.payerPublicKey}\n`;
    body += `Verified on Stellar Blockchain\n`;
  } else {
    body += `\nPayment Link: ${window.location.origin}/pay/${invoice.id}\n`;
  }
  
  body += `\nPowered by Quittance`;
  
  const mailtoLink = `mailto:${invoice.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
}

