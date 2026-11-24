'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadInvoiceBackup } from '@/lib/invoice-backup';

export default function InvoiceBackupExport({ sellerPublicKey }: { sellerPublicKey: string }) {
  const [includeEmail, setIncludeEmail] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const currentSeller = useRef(sellerPublicKey);
  currentSeller.current = sellerPublicKey;

  useEffect(() => { setIncludeEmail(false); setMessage(''); }, [sellerPublicKey]);

  async function exportBackup() {
    const seller = sellerPublicKey;
    setExporting(true);
    setMessage('');
    try {
      await downloadInvoiceBackup(seller, includeEmail);
      if (seller === currentSeller.current) setMessage('JSON backup downloaded.');
    } catch {
      if (seller === currentSeller.current) setMessage('Could not download the JSON backup. Please try again.');
    } finally { setExporting(false); }
  }

  return (
    <section aria-label="Invoice JSON backup" className="card mb-4 space-y-3">
      <p className="text-sm text-gray-600">Back up all invoices for your connected wallet, including invoices outside the current page or filter.</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={includeEmail} onChange={(event) => setIncludeEmail(event.target.checked)} disabled={exporting} />
        Include customer email addresses in this backup
      </label>
      <button type="button" onClick={exportBackup} disabled={exporting} aria-busy={exporting} className="btn btn-outline">
        {exporting ? 'Exporting JSON…' : 'Download JSON backup'}
      </button>
      <p role="status" className="text-sm">{message}</p>
    </section>
  );
}
