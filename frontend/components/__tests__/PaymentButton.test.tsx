import { describe, it, expect, vi, beforeEach, afterEach, type ComponentProps } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PaymentButton from '../PaymentButton';

const {
  mockSendPayment,
  mockCheckWalletConnection,
  mockRequestWalletAccess,
  mockGetUserPublicKey,
  mockGetAccountBalance,
  mockRequestFriendbotFunding,
  mockIsValidPublicKey,
  mockVerify,
  mockGetWalletNetwork,
  mockToast,
} = vi.hoisted(() => ({
  mockSendPayment: vi.fn(),
  mockCheckWalletConnection: vi.fn(),
  mockRequestWalletAccess: vi.fn(),
  mockGetUserPublicKey: vi.fn(),
  mockGetAccountBalance: vi.fn(),
  mockRequestFriendbotFunding: vi.fn(),
  mockIsValidPublicKey: vi.fn(),
  mockVerify: vi.fn(),
  mockGetWalletNetwork: vi.fn(),
  mockToast: {
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/lib/stellar', () => ({
  sendPayment: mockSendPayment,
  checkWalletConnection: mockCheckWalletConnection,
  requestWalletAccess: mockRequestWalletAccess,
  getUserPublicKey: mockGetUserPublicKey,
  getAccountBalance: mockGetAccountBalance,
  requestFriendbotFunding: mockRequestFriendbotFunding,
  isValidPublicKey: mockIsValidPublicKey,
  getWalletNetwork: mockGetWalletNetwork,
  getConfiguredNetwork: () =>
    process.env.NEXT_PUBLIC_STELLAR_NETWORK?.trim().toUpperCase() === 'PUBLIC'
      ? 'PUBLIC'
      : 'TESTNET',
  isTestnetNetwork: () =>
    process.env.NEXT_PUBLIC_STELLAR_NETWORK?.trim().toUpperCase() !== 'PUBLIC',
  getNetworkMismatch: (wallet: string, configured: string) =>
    wallet !== 'UNKNOWN' && wallet !== configured,
  hasEnoughXlmForFee: (balance?: string) =>
    Number.isFinite(Number(balance)) && Number(balance) >= 0.00001,
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
const PAYER_PUBLIC_KEY = 'GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V';
const FEE_SOURCE = PAYER_PUBLIC_KEY;
const TX_HASH = 'a'.repeat(64);
const PAY_IDLE_LABEL = 'Pay with Freighter';
const PAY_PROCESSING_LABEL = 'Processing...';

// The full trustline sentence the button must render for a non-native asset.
// The render helper defaults to amount="10" and this test passes USDC +
// G-USDC-ISSUER, so the copy below is asserted verbatim.
const USDC_TRUSTLINE_GUIDANCE =
  'Your Freighter wallet needs a USDC trustline to issuer G-USDC-ISSUER and at least 10 USDC. Without it the payment cannot go through.';

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
  vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'TESTNET');
  mockCheckWalletConnection.mockResolvedValue(true);
  mockRequestWalletAccess.mockResolvedValue(true);
  mockGetWalletNetwork.mockResolvedValue('TESTNET');
  mockGetUserPublicKey.mockResolvedValue(PAYER_PUBLIC_KEY);
  mockGetAccountBalance.mockResolvedValue([{ assetCode: 'XLM', balance: '1' }]);
  mockIsValidPublicKey.mockReturnValue(true);
  mockSendPayment.mockResolvedValue(TX_HASH);
  mockVerify.mockResolvedValue({ verified: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
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
    // A verified payment has settled the invoice; the control must stay off.
    expect(screen.getByRole('button', { name: PAY_IDLE_LABEL })).toBeDisabled();
  });

  it('wraps the payment when a fee source is entered', async () => {
    renderButton({ invoiceId: 'inv-482' });

    fireEvent.click(
      screen.getByRole('checkbox', { name: /another account pays the network fee/i }),
    );
    fireEvent.change(screen.getByLabelText('Fee source account'), {
      target: { value: FEE_SOURCE },
    });
    fireEvent.click(screen.getByRole('button', { name: PAY_IDLE_LABEL }));

    await waitFor(() =>
      expect(mockSendPayment).toHaveBeenCalledWith(
        DESTINATION,
        '10',
        'memo-482',
        'XLM',
        undefined,
        { feeSource: FEE_SOURCE },
      ),
    );
    expect(mockIsValidPublicKey).toHaveBeenCalledWith(FEE_SOURCE);
  });

  it('rejects an invalid fee source without sending anything', async () => {
    mockIsValidPublicKey.mockReturnValue(false);
    renderButton();

    fireEvent.click(
      screen.getByRole('checkbox', { name: /another account pays the network fee/i }),
    );
    fireEvent.change(screen.getByLabelText('Fee source account'), {
      target: { value: 'not-a-key' },
    });
    fireEvent.click(screen.getByRole('button', { name: PAY_IDLE_LABEL }));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith('Enter a valid fee source account'),
    );
    expect(mockSendPayment).not.toHaveBeenCalled();
  });

  it('shows testnet trustline guidance for non-native assets', () => {
    renderButton({ assetCode: 'USDC', assetIssuer: 'G-USDC-ISSUER' });

    expect(screen.getByText('Paying with USDC (testnet)')).toBeInTheDocument();

    // Assert the whole sentence, not a substring, so issuer, minimum amount and
    // the "without it" consequence can no longer drift silently.
    const guidance = screen.getByText(USDC_TRUSTLINE_GUIDANCE);
    expect(guidance).toBeInTheDocument();
    expect(guidance.textContent).toBe(USDC_TRUSTLINE_GUIDANCE);
  });

  it('omits trustline guidance for the native XLM asset', () => {
    renderButton();

    expect(screen.queryByText(/Paying with/)).not.toBeInTheDocument();
    expect(screen.queryByText(/trustline/)).not.toBeInTheDocument();
  });

  describe('invoice time bounds', () => {
    const inSeconds = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();

    it('passes the invoice expiry in unix seconds to sendPayment as maxTime', async () => {
      const expiresAt = inSeconds(3600);
      renderButton({ expiresAt });

      fireEvent.click(screen.getByRole('button', { name: PAY_IDLE_LABEL }));

      await waitFor(() => expect(mockSendPayment).toHaveBeenCalled());
      expect(mockSendPayment.mock.calls[0][5]).toBe(Math.floor(Date.parse(expiresAt) / 1000));
    });

    it('refuses to pay an invoice that expires in under a minute', () => {
      renderButton({ expiresAt: inSeconds(30) });

      expect(screen.getByRole('alert')).toHaveTextContent('about to expire');
      const button = screen.getByRole('button', { name: PAY_IDLE_LABEL });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(mockSendPayment).not.toHaveBeenCalled();
    });
  });
});

describe('PaymentButton testnet fee funding', () => {
  const FRIENDBOT_LABEL = /get test xlm from friendbot/i;

  it('offers Friendbot on testnet when XLM cannot cover the fee', async () => {
    mockGetAccountBalance.mockResolvedValue([{ assetCode: 'XLM', balance: '0.0000000' }]);
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: PAY_IDLE_LABEL }));

    expect(
      await screen.findByRole('button', { name: FRIENDBOT_LABEL }),
    ).toBeInTheDocument();
    expect(mockSendPayment).not.toHaveBeenCalled();
    expect(mockVerify).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('does not offer Friendbot when the account already has enough XLM', async () => {
    mockGetAccountBalance.mockResolvedValue([{ assetCode: 'XLM', balance: '100.0000000' }]);
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: PAY_IDLE_LABEL }));

    await waitFor(() => expect(mockSendPayment).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: FRIENDBOT_LABEL })).not.toBeInTheDocument();
  });

  it('does not offer Friendbot off testnet even with no XLM', async () => {
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'PUBLIC');
    mockGetWalletNetwork.mockResolvedValue('PUBLIC');
    mockGetAccountBalance.mockResolvedValue([{ assetCode: 'XLM', balance: '0.0000000' }]);
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: PAY_IDLE_LABEL }));

    await waitFor(() => expect(mockSendPayment).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: FRIENDBOT_LABEL })).not.toBeInTheDocument();
    expect(mockRequestFriendbotFunding).not.toHaveBeenCalled();
  });

  it('retries the payment after Friendbot funds the account', async () => {
    mockGetAccountBalance.mockResolvedValue([{ assetCode: 'XLM', balance: '0.0000000' }]);
    const { onSuccess } = renderButton({ invoiceId: 'inv-482' });

    fireEvent.click(screen.getByRole('button', { name: PAY_IDLE_LABEL }));
    fireEvent.click(await screen.findByRole('button', { name: FRIENDBOT_LABEL }));

    await waitFor(() =>
      expect(mockRequestFriendbotFunding).toHaveBeenCalledWith(PAYER_PUBLIC_KEY),
    );
    await waitFor(() => expect(mockSendPayment).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockVerify).toHaveBeenCalledWith('inv-482', TX_HASH, {
        payerName: undefined,
        payerEmail: undefined,
      }),
    );
    expect(onSuccess).toHaveBeenCalledWith(TX_HASH);
  });

  it('shows one sentence and keeps the invoice pending when Friendbot fails', async () => {
    mockGetAccountBalance.mockResolvedValue([{ assetCode: 'XLM', balance: '0.0000000' }]);
    mockRequestFriendbotFunding.mockRejectedValueOnce(new Error('friendbot unavailable'));
    const { onSuccess, onError } = renderButton({ invoiceId: 'inv-482' });

    fireEvent.click(screen.getByRole('button', { name: PAY_IDLE_LABEL }));
    fireEvent.click(await screen.findByRole('button', { name: FRIENDBOT_LABEL }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Friendbot could not fund this account. Try again in a moment.',
    );
    expect(mockSendPayment).not.toHaveBeenCalled();
    expect(mockVerify).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    // The offer stays available for another attempt.
    expect(screen.getByRole('button', { name: FRIENDBOT_LABEL })).toBeEnabled();
  });

  it('does not offer Friendbot for a USDC balance problem', async () => {
    mockGetAccountBalance.mockResolvedValue([
      { assetCode: 'XLM', balance: '100.0000000' },
      { assetCode: 'USDC', balance: '0.0000000' },
    ]);
    mockSendPayment.mockRejectedValueOnce(
      new Error('Insufficient USDC balance to send 10 USDC.'),
    );
    const { onError } = renderButton({
      assetCode: 'USDC',
      assetIssuer: 'G-USDC-ISSUER',
    });

    fireEvent.click(screen.getByRole('button', { name: PAY_IDLE_LABEL }));

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(mockRequestFriendbotFunding).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: FRIENDBOT_LABEL })).not.toBeInTheDocument();
    expect(screen.getByText(USDC_TRUSTLINE_GUIDANCE)).toBeInTheDocument();
  });
});
