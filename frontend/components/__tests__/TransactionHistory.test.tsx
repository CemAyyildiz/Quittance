// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────

// The component dynamically imports `server` from @/lib/stellar inside
// loadTransactions().  Return a chainable mock that resolves to zero records.
vi.mock('@/lib/stellar', () => ({
  server: {
    payments: vi.fn().mockReturnValue({
      forAccount: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            call: vi.fn().mockResolvedValue({ records: [] }),
          }),
        }),
      }),
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/networkBadgeModel', () => ({
  networkBadgeModel: vi.fn().mockReturnValue('TESTNET'),
}));

// ── Component under test ───────────────────────────────────────────────────

import TransactionHistory from '../TransactionHistory';

describe('TransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows friendly empty-state copy when transactions are empty', async () => {
    render(<TransactionHistory publicKey="GABC123DEF456" />);

    // Wait for the async loadTransactions to finish and the empty state to render.
    await waitFor(() => {
      expect(screen.getByTestId('tx-history-empty')).toBeInTheDocument();
    });

    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Payments you send or receive on this wallet will appear here/,
      ),
    ).toBeInTheDocument();
  });
});
