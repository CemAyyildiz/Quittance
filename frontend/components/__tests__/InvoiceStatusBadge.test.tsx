import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import InvoiceStatusBadge from '../InvoiceStatusBadge';

describe('InvoiceStatusBadge', () => {
  const statuses = ['PENDING', 'PAID', 'EXPIRED'] as const;

  it.each(statuses)('renders the correct accessible label for %s', (status) => {
    const expectedLabel: Record<(typeof statuses)[number], string> = {
      PENDING: 'Pending',
      PAID: 'Paid',
      EXPIRED: 'Expired',
    };

    const html = renderToStaticMarkup(<InvoiceStatusBadge status={status} />);
    const label = expectedLabel[status];
    expect(html).toContain('role="status"');
    expect(html).toContain(`aria-label="Invoice status: ${label}"`);
    expect(html).toContain(`>${label}</span>`);
  });

  it('marks the decorative dot as hidden from screen readers', () => {
    const html = renderToStaticMarkup(<InvoiceStatusBadge status="PAID" />);
    expect(html).toContain('aria-hidden="true"');
  });

  it('hides the label text when hideLabel is true but keeps the aria-label', () => {
    const html = renderToStaticMarkup(
      <InvoiceStatusBadge status="PAID" hideLabel />,
    );
    expect(html).toContain('aria-label="Invoice status: Paid"');
    expect(html).not.toContain('>Paid</span>');
  });

  it('forwards a custom data-testid', () => {
    const html = renderToStaticMarkup(
      <InvoiceStatusBadge status="EXPIRED" data-testid="expired-badge" />,
    );
    expect(html).toContain('data-testid="expired-badge"');
  });

  it('renders the aria-label when hideLabel is true for every status', () => {
    const html = renderToStaticMarkup(
      <>
        <InvoiceStatusBadge status="PENDING" hideLabel />
        <InvoiceStatusBadge status="PAID" hideLabel />
        <InvoiceStatusBadge status="EXPIRED" hideLabel />
      </>,
    );
    expect(html).toContain('aria-label="Invoice status: Pending"');
    expect(html).toContain('aria-label="Invoice status: Paid"');
    expect(html).toContain('aria-label="Invoice status: Expired"');
  });
});