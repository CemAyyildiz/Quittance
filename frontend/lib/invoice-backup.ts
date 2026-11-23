import api from './api';

export async function downloadInvoiceBackup(sellerPublicKey: string, includeCustomerEmail = false) {
  const response = await api.get('/invoices/export', {
    params: { sellerPublicKey, includeCustomerEmail },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `quittance-invoices-${sellerPublicKey.slice(0, 8)}.json`;
  document.body.appendChild(link);
  try { link.click(); }
  finally { link.remove(); URL.revokeObjectURL(url); }
}
