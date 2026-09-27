import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PaymentQrCodes from '../PaymentQrCodes';

// QRCodeDisplay renders a canvas/svg via qrcode.react — stub it out so
// jsdom doesn't need a canvas implementation.
vi.mock('@/components/QRCodeDisplay', () => ({
  default: ({ value }: { value: string }) => <div data-testid="qr">{value}</div>,
}));

describe('PaymentQrCodes', () => {
  const mockProps = {
    paymentUrl: 'https://pay.quittance.io/inv/INV-2026-0842',
    stellarPaymentUri:
      'web+stellar:pay?destination=GABCD&amount=125.5&memo=INV-2026-0842',
  };

  it('renders the "Payment link" section heading as an h3', () => {
    render(<PaymentQrCodes {...mockProps} />);
    const heading = screen.getByRole('heading', { name: 'Payment link' });
    expect(heading.tagName).toBe('H3');
  });

  it('renders the "SEP-0007 wallet payment" section heading as an h3', () => {
    render(<PaymentQrCodes {...mockProps} />);
    const heading = screen.getByRole('heading', { name: 'SEP-0007 wallet payment' });
    expect(heading.tagName).toBe('H3');
  });

  it('both section headings keep their existing Tailwind classes', () => {
    render(<PaymentQrCodes {...mockProps} />);
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(2);
    const expectedClasses = ['text-sm', 'font-medium', 'text-gray-700', 'text-center', 'mb-3'];
    for (const h of headings) {
      for (const cls of expectedClasses) {
        expect(h.className).toContain(cls);
      }
    }
  });

  it('renders the supporting sentence for the payment link section', () => {
    render(<PaymentQrCodes {...mockProps} />);
    expect(
      screen.getByText(/opens the quittance pay page in a browser/i)
    ).toBeInTheDocument();
  });

  it('renders the supporting sentence for the SEP-0007 section', () => {
    render(<PaymentQrCodes {...mockProps} />);
    expect(
      screen.getByText(/scan with a stellar wallet that supports sep-0007/i)
    ).toBeInTheDocument();
  });

  it('passes paymentUrl to the first QR code', () => {
    render(<PaymentQrCodes {...mockProps} />);
    const qrs = screen.getAllByTestId('qr');
    expect(qrs[0]).toHaveTextContent(mockProps.paymentUrl);
  });

  it('passes stellarPaymentUri to the second QR code', () => {
    render(<PaymentQrCodes {...mockProps} />);
    const qrs = screen.getAllByTestId('qr');
    expect(qrs[1]).toHaveTextContent(mockProps.stellarPaymentUri);
  });
});
