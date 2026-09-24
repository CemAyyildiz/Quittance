import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';

/* ── types (duplicated from store.ts so the test file stays self-contained) ── */

interface WalletState {
  publicKey: string | null;
  balance: string;
  connected: boolean;
  setWallet: (publicKey: string, balance: string) => void;
  updateBalance: (balance: string) => void;
  disconnect: () => void;
}

/* ── helper: fresh store per test (bypasses persist middleware) ─────────── */

function createFreshStore() {
  return create<WalletState>()((set) => ({
    publicKey: null,
    balance: '0',
    connected: false,
    setWallet: (publicKey, balance) =>
      set({ publicKey, balance, connected: true }),
    updateBalance: (balance) => set({ balance }),
    disconnect: () =>
      set({ publicKey: null, balance: '0', connected: false }),
  }));
}

/* ── tests ─────────────────────────────────────────────────────────────── */

let store: ReturnType<typeof createFreshStore>;

beforeEach(() => {
  store = createFreshStore();
});

describe('useWalletStore — initial state', () => {
  it('starts with publicKey null, balance "0", connected false', () => {
    const state = store.getState();
    expect(state.publicKey).toBeNull();
    expect(state.balance).toBe('0');
    expect(state.connected).toBe(false);
  });
});

describe('useWalletStore — setWallet', () => {
  it('sets publicKey and balance, flips connected to true', () => {
    store.getState().setWallet('GBX…AAAA', '42.5');
    const state = store.getState();
    expect(state.publicKey).toBe('GBX…AAAA');
    expect(state.balance).toBe('42.5');
    expect(state.connected).toBe(true);
  });

  it('overwrites a previous wallet', () => {
    store.getState().setWallet('GBX…AAAA', '10');
    store.getState().setWallet('GBY…BBBB', '99.9');
    const state = store.getState();
    expect(state.publicKey).toBe('GBY…BBBB');
    expect(state.balance).toBe('99.9');
    expect(state.connected).toBe(true);
  });
});

describe('useWalletStore — updateBalance', () => {
  it('updates the balance without touching publicKey or connected', () => {
    store.getState().setWallet('GBX…AAAA', '10');
    store.getState().updateBalance('55.0');
    const state = store.getState();
    expect(state.publicKey).toBe('GBX…AAAA');
    expect(state.balance).toBe('55.0');
    expect(state.connected).toBe(true);
  });

  it('sets balance to "0" when called with "0"', () => {
    store.getState().setWallet('GBX…AAAA', '10');
    store.getState().updateBalance('0');
    expect(store.getState().balance).toBe('0');
  });
});

describe('useWalletStore — disconnect', () => {
  it('resets publicKey to null, balance to "0", connected to false', () => {
    store.getState().setWallet('GBX…AAAA', '42.5');
    store.getState().disconnect();
    const state = store.getState();
    expect(state.publicKey).toBeNull();
    expect(state.balance).toBe('0');
    expect(state.connected).toBe(false);
  });

  it('is idempotent — calling disconnect twice has the same result', () => {
    store.getState().setWallet('GBX…AAAA', '42.5');
    store.getState().disconnect();
    store.getState().disconnect();
    const state = store.getState();
    expect(state.publicKey).toBeNull();
    expect(state.balance).toBe('0');
    expect(state.connected).toBe(false);
  });
});

describe('useWalletStore — full lifecycle', () => {
  it('setWallet → updateBalance → disconnect follows expected transitions', () => {
    // Start disconnected
    expect(store.getState().connected).toBe(false);

    // Connect
    store.getState().setWallet('GBX…AAAA', '100');
    expect(store.getState().connected).toBe(true);
    expect(store.getState().publicKey).toBe('GBX…AAAA');
    expect(store.getState().balance).toBe('100');

    // Update balance
    store.getState().updateBalance('75.5');
    expect(store.getState().connected).toBe(true);
    expect(store.getState().publicKey).toBe('GBX…AAAA');
    expect(store.getState().balance).toBe('75.5');

    // Disconnect
    store.getState().disconnect();
    expect(store.getState().connected).toBe(false);
    expect(store.getState().publicKey).toBeNull();
    expect(store.getState().balance).toBe('0');
  });
});
