import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock explorerUrl
vi.mock('../explorerUrl', () => ({
  explorerTxUrl: vi.fn((hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`),
}));

// Capture the stream callback so tests can simulate incoming payments
let streamOnmessage: ((record: any) => void) | undefined;
let streamOnerror: ((error: any) => void) | undefined;

// Use vi.hoisted so these survive vi.mock hoisting
const mockStream = vi.hoisted(() => vi.fn());
const mockPayments = vi.hoisted(() => vi.fn());
const mockTransactions = vi.hoisted(() => vi.fn());

// Set up the mock implementations now that hoisted refs exist
mockStream.mockReturnValue(vi.fn()); // returns close handler

const mockForAccount = vi.fn(() => ({
  cursor: vi.fn(() => ({
    stream: vi.fn((callbacks: { onmessage: (r: any) => void; onerror: (e: any) => void }) => {
      streamOnmessage = callbacks.onmessage;
      streamOnerror = callbacks.onerror;
      return mockStream();
    }),
  })),
}));

mockPayments.mockReturnValue({
  forAccount: mockForAccount,
});

mockTransactions.mockReturnValue({
  transaction: vi.fn(() => ({
    call: vi.fn().mockResolvedValue({ memo: 'test-memo' }),
  })),
});

// Mock stellar server
vi.mock('../stellar', () => ({
  server: {
    payments: (...args: any[]) => mockPayments(...args),
    transactions: (...args: any[]) => mockTransactions(...args),
  },
}));

// Import after mocks are set up
import { paymentMonitor } from '../payment-monitor';

describe('paymentMonitor.isMonitoring()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentMonitor.stopAll();
    streamOnmessage = undefined;
    streamOnerror = undefined;
  });

  afterEach(() => {
    paymentMonitor.stopAll();
  });

  it('returns false when no monitoring is active', () => {
    expect(paymentMonitor.isMonitoring('GBXXXX')).toBe(false);
  });

  it('returns true after startMonitoring is called', () => {
    paymentMonitor.startMonitoring('GBXXXX');
    expect(paymentMonitor.isMonitoring('GBXXXX')).toBe(true);
  });

  it('returns false for an address that is not being monitored', () => {
    paymentMonitor.startMonitoring('GBAAAA');
    expect(paymentMonitor.isMonitoring('GBBBBB')).toBe(false);
  });

  it('returns false after stopMonitoring is called', () => {
    paymentMonitor.startMonitoring('GBXXXX');
    paymentMonitor.stopMonitoring('GBXXXX');
    expect(paymentMonitor.isMonitoring('GBXXXX')).toBe(false);
  });

  it('returns false after stopAll is called', () => {
    paymentMonitor.startMonitoring('GBAAAA');
    paymentMonitor.startMonitoring('GBBBBB');
    paymentMonitor.stopAll();
    expect(paymentMonitor.isMonitoring('GBAAAA')).toBe(false);
    expect(paymentMonitor.isMonitoring('GBBBBB')).toBe(false);
  });

  it('returns true for multiple monitored addresses', () => {
    paymentMonitor.startMonitoring('GBAAAA');
    paymentMonitor.startMonitoring('GBBBBB');
    expect(paymentMonitor.isMonitoring('GBAAAA')).toBe(true);
    expect(paymentMonitor.isMonitoring('GBBBBB')).toBe(true);
  });
});

describe('paymentMonitor.getActiveCount()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentMonitor.stopAll();
    streamOnmessage = undefined;
    streamOnerror = undefined;
  });

  afterEach(() => {
    paymentMonitor.stopAll();
  });

  it('returns 0 when no monitoring is active', () => {
    expect(paymentMonitor.getActiveCount()).toBe(0);
  });

  it('returns 1 after one address is monitored', () => {
    paymentMonitor.startMonitoring('GBXXXX');
    expect(paymentMonitor.getActiveCount()).toBe(1);
  });

  it('increments count as more addresses are monitored', () => {
    paymentMonitor.startMonitoring('GBAAAA');
    expect(paymentMonitor.getActiveCount()).toBe(1);
    paymentMonitor.startMonitoring('GBBBBB');
    expect(paymentMonitor.getActiveCount()).toBe(2);
  });

  it('does not increment for duplicate address', () => {
    paymentMonitor.startMonitoring('GBXXXX');
    paymentMonitor.startMonitoring('GBXXXX');
    expect(paymentMonitor.getActiveCount()).toBe(1);
  });

  it('decrements after stopMonitoring', () => {
    paymentMonitor.startMonitoring('GBAAAA');
    paymentMonitor.startMonitoring('GBBBBB');
    paymentMonitor.stopMonitoring('GBAAAA');
    expect(paymentMonitor.getActiveCount()).toBe(1);
  });

  it('returns 0 after stopAll', () => {
    paymentMonitor.startMonitoring('GBAAAA');
    paymentMonitor.startMonitoring('GBBBBB');
    paymentMonitor.startMonitoring('GBCCCC');
    paymentMonitor.stopAll();
    expect(paymentMonitor.getActiveCount()).toBe(0);
  });
});

describe('paymentMonitor.startMonitoring() – stream integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentMonitor.stopAll();
    streamOnmessage = undefined;
    streamOnerror = undefined;
  });

  afterEach(() => {
    paymentMonitor.stopAll();
  });

  it('invokes callback when a matching payment arrives', async () => {
    const cb = vi.fn();
    paymentMonitor.startMonitoring('GBDEST', cb);

    const record = {
      id: '1',
      type: 'payment',
      to: 'GBDEST',
      from: 'GBSENDER',
      amount: '10.0',
      asset_type: 'native',
      transaction_hash: 'TXHASH123',
      created_at: '2026-08-30T00:00:00Z',
    };

    await streamOnmessage!(record);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'GBSENDER',
        to: 'GBDEST',
        amount: '10.0',
        assetCode: 'XLM',
      })
    );
  });

  it('ignores payments not directed to the monitored address', async () => {
    const cb = vi.fn();
    paymentMonitor.startMonitoring('GBDEST', cb);

    await streamOnmessage!({
      id: '2',
      type: 'payment',
      to: 'GBOTHER',
      from: 'GBSENDER',
      amount: '5.0',
      asset_type: 'native',
      transaction_hash: 'TXHASH456',
      created_at: '2026-08-30T00:00:00Z',
    });

    expect(cb).not.toHaveBeenCalled();
  });
});
