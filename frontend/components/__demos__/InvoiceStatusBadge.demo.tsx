import InvoiceStatusBadge from '../InvoiceStatusBadge';

export default function InvoiceStatusBadgeDemo() {
  return (
    <div className="space-y-8 p-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold">Statuses</h2>
        <div className="flex flex-wrap gap-3">
          <InvoiceStatusBadge status="PENDING" />
          <InvoiceStatusBadge status="PAID" />
          <InvoiceStatusBadge status="EXPIRED" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Size Variants</h2>
        <div className="flex flex-wrap items-center gap-3">
          <InvoiceStatusBadge status="PAID" size="sm" />
          <InvoiceStatusBadge status="PAID" size="md" />
          <InvoiceStatusBadge status="PAID" size="lg" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">
          Compact (dot-only, screen-reader accessible)
        </h2>
        <div className="flex flex-wrap gap-3">
          <InvoiceStatusBadge status="PENDING" hideLabel />
          <InvoiceStatusBadge status="PAID" hideLabel />
          <InvoiceStatusBadge status="EXPIRED" hideLabel />
        </div>
      </section>
    </div>
  );
}
