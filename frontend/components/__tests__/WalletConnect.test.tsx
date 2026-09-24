// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const FREIGHTER_INSTALL_URL = 'https://www.freighter.app/';

vi.mock('@/lib/stellar', () => ({
  checkWalletConnection: vi.fn().mockResolvedValue(false),
  requestWalletAccess: vi.fn().mockRejectedValue(new Error('Freighter not available')),
  getUserPublicKey: vi.fn().mockResolvedValue(null),
  getAccountBalance: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/store', () => ({
  useWalletStore: vi.fn(() => ({
    publicKey: null,
    balance: '0',
    connected: false,
    setWallet: vi.fn(),
    updateBalance: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock('@/lib/payment-monitor', () => ({
  paymentMonitor: {
    isMonitoring: vi.fn().mockReturnValue(false),
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('lucide-react', () => ({
  Wallet: (props: any) => <svg data-testid="icon-wallet" {...props} />,
  LogOut: (props: any) => <svg data-testid="icon-logout" {...props} />,
  Loader2: (props: any) => <svg data-testid="icon-loader" {...props} />,
  ExternalLink: (props: any) => <svg data-testid="icon-external" {...props} />,
  Bell: (props: any) => <svg data-testid="icon-bell" {...props} />,
  BellOff: (props: any) => <svg data-testid="icon-bell-off" {...props} />,
}));

vi.mock('@/lib/utils', () => ({
  formatAddress: (addr: string, chars: number = 4) =>
    `${addr.slice(0, chars)}...${addr.slice(-chars)}`,
}));

vi.mock('@/lib/explorerUrl', () => ({
  explorerAccountUrl: (key: string) => `https://stellar.expert/testnet/account/${key}`,
}));

import WalletConnect from '../WalletConnect';
import { requestWalletAccess } from '@/lib/stellar';
import { toast } from 'sonner';

function FreighterGuard() {
  const [freighterUnavailable, setFreighterUnavailable] = useState(false);
  return (
    <>
      <WalletConnect onConnectionFailure={() => setFreighterUnavailable(true)} />
      {freighterUnavailable && (
        <a
          href={FREIGHTER_INSTALL_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Install Freighter
        </a>
      )}
    </>
  );
}

describe('WalletConnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Connect Wallet button when not connected', () => {
    render(<WalletConnect />);
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('calls onConnectionFailure when Freighter is unavailable', async () => {
    const onConnectionFailure = vi.fn();
    render(<WalletConnect onConnectionFailure={onConnectionFailure} />);

    screen.getByRole('button', { name: /connect wallet/i }).click();

    await waitFor(() => {
      expect(requestWalletAccess).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(onConnectionFailure).toHaveBeenCalled();
    });
  });

  it('renders install link with FREIGHTER_INSTALL_URL when Freighter is unavailable', async () => {
    render(<FreighterGuard />);

    screen.getByRole('button', { name: /connect wallet/i }).click();

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /install freighter/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', FREIGHTER_INSTALL_URL);
    });
  });

  it('shows toast error when Freighter is unavailable', async () => {
    render(<WalletConnect />);

    screen.getByRole('button', { name: /connect wallet/i }).click();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Freighter')
      );
    });
  });
});
