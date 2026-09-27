import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import QRCodeDisplay from '../QRCodeDisplay';
import { copyToClipboard } from '@/lib/utils';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils');
  return { ...actual, copyToClipboard: vi.fn() };
});

const copyMock = vi.mocked(copyToClipboard);

const validPaymentUrl = 'https://example.com/payment';
const base64DataUrl = 'data:image/png;base64,abc123';

describe('QRCodeDisplay', () => {
  beforeEach(() => {
    copyMock.mockReset();
    copyMock.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders QR code SVG for shareable value', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={validPaymentUrl} />
    );
    expect(html).toContain('svg');
  });

  it('renders error message for base64 data URL', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={base64DataUrl} />
    );
    expect(html).toContain('QR preview unavailable');
  });

  it('does not render QR code for base64 data URL', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={base64DataUrl} />
    );
    expect(html).not.toContain('QRCodeSVG');
    expect(html).toContain('text-red-600');
  });

  it('renders QR code with title', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={validPaymentUrl} title='Payment QR' />
    );
    expect(html).toContain('Payment QR');
  });

  it('renders QR code with custom size', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={validPaymentUrl} size={512} />
    );
    expect(html).toContain('512');
  });

  it('renders with showCopy=false hides copy button', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={validPaymentUrl} showCopy={false} />
    );
    expect(html).not.toContain('btn-secondary');
  });

  it('renders with showCopy=true shows copy button for shareable value', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={validPaymentUrl} showCopy={true} />
    );
    expect(html).toContain('btn-secondary');
  });

  it('hides the copy control when the value is not shareable', () => {
    const html = renderToStaticMarkup(
      <QRCodeDisplay value={base64DataUrl} showCopy={true} />
    );
    expect(html).not.toContain('btn-secondary');
    expect(html).toContain('QR preview unavailable');
  });

  // The copy control is icon-only, so its aria-label is the whole accessible name.
  it('names the copy control "Copy to clipboard" while idle', () => {
    render(<QRCodeDisplay value={validPaymentUrl} />);

    expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeInTheDocument();
  });

  it('renames the copy control to "Copied to clipboard" after a successful copy', async () => {
    render(<QRCodeDisplay value={validPaymentUrl} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));

    await waitFor(() => expect(copyMock).toHaveBeenCalledWith(validPaymentUrl));
    expect(screen.getByRole('button', { name: 'Copied to clipboard' })).toBeInTheDocument();
  });

  it('keeps the idle copy name when the clipboard write fails', async () => {
    copyMock.mockResolvedValue(false);
    render(<QRCodeDisplay value={validPaymentUrl} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));

    await waitFor(() => expect(copyMock).toHaveBeenCalledWith(validPaymentUrl));
    expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copied to clipboard' })).not.toBeInTheDocument();
  });

  it('hides both copy icons from assistive technology', async () => {
    const { container } = render(<QRCodeDisplay value={validPaymentUrl} />);

    const idleIcon = container.querySelector('button svg');
    expect(idleIcon).not.toBeNull();
    expect(idleIcon).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Copied to clipboard' })).toBeInTheDocument(),
    );

    const copiedIcon = container.querySelector('button svg');
    expect(copiedIcon).not.toBeNull();
    expect(copiedIcon).toHaveAttribute('aria-hidden', 'true');
    // The swapped-in glyph is the check icon, not the idle copy icon.
    expect(copiedIcon).toHaveClass('text-green-600');
  });
});