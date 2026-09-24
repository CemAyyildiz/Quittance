import { describe, it, expect, vi, beforeEach, afterEach, type ComponentProps } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PaymentButton from '../PaymentButton';

const {
  mockSendPayment,
  mockCheckWalletConnection,
  mockRequestWalletAccess,
  mockVerify,
  mockToast,
} = vi.hoisted(() => ({
  mockSendPayment: vi.fn(),
  mockCheckWalletConnection: vi.fn(),
  mockRequestWalletAccess: vi.fn(),
  mockVerify: vi.fn(),
  mockToast: {
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

// The payment flow must never touch the real Horizon/Freighter SDK or the
// real invoice backend while testing, so both are replaced with mocks.
vi.mock('@/lib/stellar', () => ({
  sendPayment: mockSendPayment,
  checkWalletConnection: mockCheckWalletConnection,
  requestWalletAccess: mockRequestWalletAccess,
}));

vi.mock('@/lib/api', () => ({
  invoiceApi: {
    verify: mockVerify,
  },
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

const DESTINATION = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const TX_HASH = 'a'.repeat(64);
const PAY_IDLE_LABEL = 'Pay with Freighter';
const PAY_PROCESSING_LABEL = 'Processing...';

type PaymentButtonProps = ComponentProps<typeof PaymentButton>;

function renderButton(overrides: Partial<PaymentButtonProps> = {}) {
  const onSuccess = overrides.onSuccess ?? vi.fn();
  const onError = overrides.onError ?? vi.fn();
  const view = render(
    <PaymentButton
      destination={DESTINATION}
      amount="10"
      memo="memo-482"
      onSuccess={onSuccess}
      onError={onError}
      {...overrides}
    />,
  );
  return { ...view, onSuccess, onError };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckWalletConnection.mockResolvedValue(true);
  mockRequestWalletAccess.mockResolvedValue(true);
  mockSendPayment.mockResolvedValue(TX_HASH);
  mockVerify.mockResolvedValue({ verified: true });
});

afterEach(() => {
  cleanup();
});

describe('PaymentButton', () => {
  it('renders an enabled "Pay with Freighter" button with no spinner while idle', () => {
    renderButton();

    const button = screen.getByRole('button', { name: PAY_IDLE_LABEL });
    expect(button).toBeEnabled();
    expect(screen.queryByText(PAY_PROCESSING_LABEL)).not.toBeInTheDocument();
    expect(button.querySelector('.animate-spin')).toBeNull();
  });

  it('shows a loading, disabled button while the payment is in progress and re-enables after it settles', async () => {
    let resolveSendPayment: (hash: string) => void;
    mockSendPayment.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          // Deliberately keep the payment pending so we can assert the
          // in-flight UI before it finishes.
          resolveSendPayment = resolve;
        }),
    );

    const { onSuccess } = renderButton();

    fireEvent.click(screen.getByRole('button', { name: PAY_IDLE_LABEL }));

    // While sendPayment is still pending the button must swap to a spinner +
    // "Processing..." label and be disabled so the user cannot double-submit.
    await waitFor(() => {
      const processing = screen.getByRole('button', { name: PAY_PROCESSING_LABEL });
      expect(processing).toBeDisabled();
      expect(processing.querySelector('.animate-spin')).not.toBeNull();
      expect(screen.queryByRole('button', { name: PAY_IDLE_LABEL })).not.toBeInTheDocument();
    });

    // Resolve the pending payment; the button must return to the idle state.
    await act(async () => {
      resolveSendPayment!(TX_HASH);
    });

    expect(screen.getByRole('button', { name: PAY_IDLE_LABEL })).toBeEnabled();
    expect(screen.queryByText(PAY_PROCESSING_LABEL)).not.toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledWith(TX_HASH);
  });

  it('re-enables the button and reports failures when the payment errors', async () => {
    mockSendPayment.mockRejectedValueOnce(new Error('Horizon timeout'));

    const { onError } = renderButton();

    fireEvent.click(screen.getByRole('button', { name: PAY_IDLE_LABEL }));

    await waitFor(() => expect(onError).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: PAY_IDLE_LABEL })).toBeEnabled();
    expect(screen.queryByText(PAY_PROCESSING_LABEL)).not.toBeInTheDocument();
  });

  it('cancels without sending when the user denies wallet access', async () => {
    mockCheckWalletConnection.mockResolvedValue(false);
    mockRequestWalletAccess.mockResolvedValue(false);

    renderButton();

    fireEvent.click(screen.getByRole('button', { name: PAY_IDLE_LABEL }));

    await waitFor(() => expect(mockRequestWalletAccess).toHaveBeenCalled());

    expect(mockSendPayment).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith('Access denied');
    expect(screen.getByRole('button', { name: PAY_IDLE_LABEL })).toBeEnabled();
  });

  it('verifies the invoice through the invoice API when an invoiceId is provided', async () => {
    const { onSuccess } = renderButton({
      invoiceId: 'inv-482',
      payerName: 'Ada Lovelace',
      payerEmail: 'ada@example.com',
    });

    fireEvent.click(screen.getByRole('button', { name: PAY_IDLE_LABEL }));

    await waitFor(() =>
      expect(mockVerify).toHaveBeenCalledWith('inv-482', TX_HASH, {
        payerName: 'Ada Lovelace',
        payerEmail: 'ada@example.com',
      }),
    );
    expect(mockToast.loading).toHaveBeenCalledWith('Confirm in wallet...', {
      id: 'payment-flow',
    });
    expect(onSuccess).toHaveBeenCalledWith(TX_HASH);
    expect(screen.getByRole('button', { name: PAY_IDLE_LABEL })).toBeEnabled();
  });

  it('shows testnet trustline guidance for non-native assets', () => {
    renderButton({ assetCode: 'USDC', assetIssuer: 'G-USDC-ISSUER' });

    expect(screen.getByText('Paying with USDC (testnet)')).toBeInTheDocument();
    expect(screen.getByText(/Freighter wallet needs a USDC trustline/)).toBeInTheDocument();
  });

  it('omits trustline guidance for the native XLM asset', () => {
    renderButton();

    expect(screen.queryByText(/Paying with/)).not.toBeInTheDocument();
    expect(screen.queryByText(/trustline/)).not.toBeInTheDocument();
  });
});
