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
  formatAmount: vi.fn((amount: number, decimals = 2) =>
    amount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  ),
}));

describe('PaymentQrCodes', () => {
  const mockProps = {
    memo: 'INV-2026-0842',
    amount: 125.5,
    destination: 'GBOXJFZQU3IFDMN2V5EYBY4SXDYKRGWZ7VXKS46H4S3H5EXAMPLE',
  };

  it('renders the memo', () => {
    render(<PaymentQrCodes {...mockProps} />);
    expect(screen.getByText('INV-2026-0842')).toBeInTheDocument();
  });

  it('renders the amount', () => {
    render(<PaymentQrCodes {...mockProps} />);
    expect(screen.getByText(/125\.5/)).toBeInTheDocument();
  });

  it('renders the destination', () => {
    render(<PaymentQrCodes {...mockProps} />);
    expect(
      screen.getByText('GBOXJFZQU3IFDMN2V5EYBY4SXDYKRGWZ7VXKS46H4S3H5EXAMPLE')
    ).toBeInTheDocument();
  });

  it('renders the QR code section heading', () => {
    render(<PaymentQrCodes {...mockProps} />);
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
  });

  it('renders payment information heading', () => {
    render(<PaymentQrCodes {...mockProps} />);
    expect(screen.getByText('Payment Information')).toBeInTheDocument();
  });

  it('displays default asset code XLM', () => {
    render(<PaymentQrCodes {...mockProps} />);
    expect(screen.getByText(/XLM/)).toBeInTheDocument();
  });
});
