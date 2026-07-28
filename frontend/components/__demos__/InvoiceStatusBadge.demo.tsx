import InvoiceStatusBadge from '../InvoiceStatusBadge';

export default function InvoiceStatusBadgeDemo() {
  return (
    <div className="flex flex-wrap gap-3 p-6">
      <InvoiceStatusBadge status="PENDING" />
      <InvoiceStatusBadge status="PAID" />
      <InvoiceStatusBadge status="EXPIRED" />
    </div>
  );
}
