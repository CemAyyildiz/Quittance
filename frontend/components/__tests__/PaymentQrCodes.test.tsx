import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PaymentQrCodes from '../PaymentQrCodes';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/utils', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

describe('PaymentQrCodes', () => {
  const paymentUrl = 'https://app.example.com/pay/inv-2026-0842';
  const stellarPaymentUri =
    'web+stellar:pay?destination=GBOXJFZQU3IFDMN2V5EYBY4SXDYKRGWZ7VXKS46H4S3H5EXAMPLE&amount=125.5&asset_code=XLM&memo=INV-2026-0842';

  const mockProps = { paymentUrl, stellarPaymentUri };

  it('renders the payment link encoding', () => {
    render(<PaymentQrCodes {...mockProps} />);
    expect(screen.getByText('Payment link')).toBeTruthy();
    expect(screen.getByText(paymentUrl)).toBeTruthy();
  });

  it('renders the SEP-0007 wallet payment encoding', () => {
    render(<PaymentQrCodes {...mockProps} />);
    expect(screen.getByText('SEP-0007 wallet payment')).toBeTruthy();
    expect(screen.getByText(stellarPaymentUri)).toBeTruthy();
  });

  it('renders a QR code for each encoding', () => {
    const { container } = render(<PaymentQrCodes {...mockProps} />);
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
  });

  it('passes the requested size to both QR codes', () => {
    const { container } = render(<PaymentQrCodes {...mockProps} size={320} />);
    expect(container.querySelectorAll('svg[width="320"]').length).toBe(2);
  });
});
