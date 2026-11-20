import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StatusHistory from '../StatusHistory';

describe('StatusHistory', () => {
  it('renders rows oldest first with status, time and transaction hash', () => {
    const html = renderToStaticMarkup(
      <StatusHistory
        entries={[
          { status: 'CREATED', at: '2026-01-01T10:00:00.000Z' },
          { status: 'PARTIALLY_PAID', at: '2026-01-01T11:00:00.000Z', txHash: 'TX_PARTIAL' },
          { status: 'PAID', at: '2026-01-01T12:00:00.000Z', txHash: 'TX_PAID' },
        ]}
      />,
    );

    expect(html).toContain('Status history');
    expect(html).toContain('Created');
    expect(html).toContain('Partially paid');
    expect(html).toContain('Paid');
    expect(html).toContain('TX_PARTIAL');
    expect(html).toContain('TX_PAID');
    expect(html.indexOf('Created')).toBeLessThan(html.indexOf('Partially paid'));
    expect(html.indexOf('Partially paid')).toBeLessThan(html.indexOf('TX_PAID'));
  });

  it('never renders a customer email', () => {
    const html = renderToStaticMarkup(
      <StatusHistory entries={[{ status: 'CREATED', at: '2026-01-01T10:00:00.000Z' }]} />,
    );
    expect(html).not.toContain('@');
  });
});
