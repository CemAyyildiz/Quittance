export type InvoiceStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'EXPIRED' | 'CANCELLED';

export function canCancel(status: InvoiceStatus): boolean {
  return status === 'PENDING';
}

export function isPending(status: InvoiceStatus): boolean {
  return status === 'PENDING';
}

export function isPaid(status: InvoiceStatus): boolean {
  return status === 'PAID';
}

export function isExpired(status: InvoiceStatus): boolean {
  return status === 'EXPIRED';
}
export function isCancelled(status: InvoiceStatus): boolean {
  return status === 'CANCELLED';
}
