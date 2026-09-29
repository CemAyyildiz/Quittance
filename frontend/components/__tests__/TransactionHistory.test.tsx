// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const WALLET_PK = 'GABC123DEF456';
const OTHER_PK = 'GOTHERPARTYKEY1234567890123456789012345678901234567890';

// ── Mock factory (defined before vi.mock so it's hoisted) ───────────────────

function createPaymentRecord(overrides: {
  id?: string;
  hash?: string;
  from?: string;
  to?: string;
  amount?: string;
  assetType?: string;
  assetCode?: string;
  assetIssuer?: string;
  createdAt?: string;
  ledger?: number;
  type?: 'payment' | 'create_account';
} = {}) {
  return {
    id: overrides.id || 'tx-001',
    transaction_hash: overrides.hash || 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    type: overrides.type || 'payment',
    from: overrides.from,
    to: overrides.to,
    amount: overrides.amount || '100.0000000',
    asset_type: overrides.assetType || 'native',
    asset_code: overrides.assetCode,
    asset_issuer: overrides.assetIssuer,
    created_at: overrides.createdAt || '2026-01-15T10:30:00.000Z',
    ledger_attr: overrides.ledger || 123456,
  };
}

function createMockServer(payments: ReturnType<typeof createPaymentRecord>[]) {
  const memoMap = new Map<string, string>();

  return {
    payments: vi.fn().mockReturnValue({
      forAccount: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            call: vi.fn().mockResolvedValue({ records: payments }),
          }),
        }),
      }),
    }),
    transactions: vi.fn().mockReturnValue({
      transaction: vi.fn().mockReturnValue({
        call: vi.fn().mockImplementation(async (hash: string) => ({
          memo: memoMap.get(hash),
        })),
      }),
    }),
    _setMemo: (hash: string, memo: string) => memoMap.set(hash, memo),
  };
}

// ── Hoisted mock state (vi.mock factories are hoisted) ────────────────────────
// Must use vi.hoisted() so the factory never closes over a module-level `let`,
// which would throw "Cannot access before initialization".

const mockState = vi.hoisted(() => ({ current: null as any }));

vi.mock('@/lib/stellar', () => ({
  get server() {
    return mockState.current;
  },
  __setMockServer: (s: any) => {
    mockState.current = s;
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
import { __setMockServer } from '@/lib/stellar';

describe('TransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setMockServer(createMockServer([]));
  });

  it('shows friendly empty-state copy when transactions are empty', async () => {
    render(<TransactionHistory publicKey={WALLET_PK} />);

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

  describe('sent / received filters', () => {
    const receivedPayment = createPaymentRecord({
      id: 'received-001',
      hash: 'rx111111111111111111111111111111111111111111111111111111111111',
      from: OTHER_PK,
      to: WALLET_PK,
      amount: '50.0000000',
      assetType: 'native',
      createdAt: '2026-01-15T10:30:00.000Z',
    });

    const sentPayment = createPaymentRecord({
      id: 'sent-001',
      hash: 'tx222222222222222222222222222222222222222222222222222222222222',
      from: WALLET_PK,
      to: OTHER_PK,
      amount: '25.0000000',
      assetType: 'native',
      createdAt: '2026-01-14T09:15:00.000Z',
    });

    beforeEach(() => {
      const mock = createMockServer([receivedPayment, sentPayment]);
      mock._setMemo(receivedPayment.transaction_hash, 'INV-RECEIVED-001');
      mock._setMemo(sentPayment.transaction_hash, 'INV-SENT-001');
      __setMockServer(mock);
    });

    it('shows both rows when All filter is active', async () => {
      render(<TransactionHistory publicKey={WALLET_PK} />);

      await waitFor(() => {
        expect(screen.getByText('Received from')).toBeInTheDocument();
        expect(screen.getByText('Sent to')).toBeInTheDocument();
      });

      expect(screen.getByText(/\+50\.00/)).toBeInTheDocument();
      expect(screen.getByText(/-25\.00/)).toBeInTheDocument();
    });

    it('shows only incoming row when Received filter is active', async () => {
      render(<TransactionHistory publicKey={WALLET_PK} />);

      await waitFor(() => {
        expect(screen.getByText('Received from')).toBeInTheDocument();
      });

      // Click Received filter
      const receivedBtn = screen.getByRole('button', { name: /^Received$/i });
      receivedBtn.click();

      await waitFor(() => {
        expect(screen.getByText('Received from')).toBeInTheDocument();
        expect(screen.queryByText('Sent to')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/\+50\.00/)).toBeInTheDocument();
      expect(screen.queryByText(/-25\.00/)).not.toBeInTheDocument();
    });

    it('shows only outgoing row when Sent filter is active', async () => {
      render(<TransactionHistory publicKey={WALLET_PK} />);

      await waitFor(() => {
        expect(screen.getByText('Sent to')).toBeInTheDocument();
      });

      // Click Sent filter
      const sentBtn = screen.getByRole('button', { name: /^Sent$/i });
      sentBtn.click();

      await waitFor(() => {
        expect(screen.getByText('Sent to')).toBeInTheDocument();
        expect(screen.queryByText('Received from')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/-25\.00/)).toBeInTheDocument();
      expect(screen.queryByText(/\+50\.00/)).not.toBeInTheDocument();
    });
  });
});
