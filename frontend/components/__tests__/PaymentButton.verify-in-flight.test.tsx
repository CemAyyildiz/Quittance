import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PaymentButton from '../PaymentButton';

const { mockSendPayment, mockVerify, mockGetWalletNetwork, mockToast } = vi.hoisted(() => ({
  mockSendPayment: vi.fn(),
  mockVerify: vi.fn(),
  mockGetWalletNetwork: vi.fn(),
  mockToast: {
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

const PAYER_PUBLIC_KEY = 'GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V';
const TX_HASH = 'a'.repeat(64);
const PAY_LABEL = 'Pay with Freighter';
const PROCESSING_LABEL = 'Processing...';

// Wallet, Horizon and invoice API calls are mocked; the pure fee/network
// helpers stay real so the button takes its normal path.
vi.mock('@/lib/stellar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/stellar')>();
  return {
    ...actual,
    sendPayment: mockSendPayment,
    checkWalletConnection: vi.fn().mockResolvedValue(true),
    requestWalletAccess: vi.fn().mockResolvedValue(true),
    getWalletNetwork: mockGetWalletNetwork,
    getUserPublicKey: vi
      .fn()
      .mockResolvedValue('GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V'),
    getAccountBalance: vi.fn().mockResolvedValue([{ assetCode: 'XLM', balance: '100.0000000' }]),
  };
});

vi.mock('@/lib/api', () => ({
  invoiceApi: { verify: mockVerify },
}));

vi.mock('sonner', () => ({ toast: mockToast }));

function renderButton(overrides: Record<string, unknown> = {}) {
  const onSuccess = vi.fn();
  const onError = vi.fn();
  const view = render(
    <PaymentButton
      destination={PAYER_PUBLIC_KEY}
      amount="10"
      memo="memo-1131"
      invoiceId="inv-1131"
      onSuccess={onSuccess}
      onError={onError}
      {...overrides}
    />,
  );
  return { ...view, onSuccess, onError };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'TESTNET');
  mockGetWalletNetwork.mockResolvedValue('TESTNET');
  mockSendPayment.mockResolvedValue(TX_HASH);
  mockVerify.mockResolvedValue({ verified: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('PaymentButton while verification is in flight', () => {
  it('stays disabled from the start of verification and after it succeeds', async () => {
    let resolveVerify: (value: unknown) => void = () => {};
    mockVerify.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          // Keep verification pending so the in-flight state can be observed.
          resolveVerify = resolve;
        }),
    );

    renderButton();

    fireEvent.click(screen.getByRole('button', { name: PAY_LABEL }));

    await waitFor(() =>
      expect(mockVerify).toHaveBeenCalledWith('inv-1131', TX_HASH, {
        payerName: undefined,
        payerEmail: undefined,
      }),
    );

    // Verification is still running: the control must not be clickable.
    expect(screen.getByRole('button', { name: PROCESSING_LABEL })).toBeDisabled();

    await act(async () => {
      resolveVerify({ verified: true });
    });

    // A successful verification settles the invoice, so it stays disabled.
    expect(screen.getByRole('button', { name: PAY_LABEL })).toBeDisabled();
  });

  it('does not re-enable the control while a slow verification is still pending', async () => {
    let resolveVerify: (value: unknown) => void = () => {};
    mockVerify.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveVerify = resolve;
        }),
    );

    renderButton();
    fireEvent.click(screen.getByRole('button', { name: PAY_LABEL }));

    await waitFor(() => expect(mockVerify).toHaveBeenCalled());
    // Wait long enough that a naive implementation would have cleared loading.
    await new Promise((resolve) => setTimeout(resolve, 75));

    expect(screen.getByRole('button', { name: PROCESSING_LABEL })).toBeDisabled();
    expect(mockSendPayment).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveVerify({ verified: true });
    });
  });

  it('re-enables the control when verification fails', async () => {
    mockVerify.mockRejectedValueOnce(new Error('verification unavailable'));

    renderButton();
    fireEvent.click(screen.getByRole('button', { name: PAY_LABEL }));

    await waitFor(() => expect(mockVerify).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('button', { name: PAY_LABEL })).toBeEnabled());
  });

  it('stays disabled when the parent reports the payment is not payable', () => {
    renderButton({ disabled: true });

    expect(screen.getByRole('button', { name: PAY_LABEL })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: PAY_LABEL }));
    expect(mockSendPayment).not.toHaveBeenCalled();
  });
});
