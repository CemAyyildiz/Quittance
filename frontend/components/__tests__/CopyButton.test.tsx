import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import CopyButton from '../CopyButton';
import { copyToClipboard } from '@/lib/utils';

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils');
  return { ...actual, copyToClipboard: vi.fn() };
});

const copyMock = vi.mocked(copyToClipboard);

describe('CopyButton', () => {
  beforeEach(() => {
    copyMock.mockReset();
    copyMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the default copy state and copies the supplied text', async () => {
    render(<CopyButton text="INV-42" />);

    const button = screen.getByRole('button', { name: 'Copy' });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);

    await waitFor(() => expect(copyMock).toHaveBeenCalledWith('INV-42'));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('returns to the copy state after the success timeout', async () => {
    vi.useFakeTimers();
    render(<CopyButton text="memo" timeout={1000} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('does not call the clipboard when disabled', () => {
    render(<CopyButton text="secret" disabled />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(copyMock).not.toHaveBeenCalled();
  });

  it('reports a failed clipboard attempt without showing copied state', async () => {
    copyMock.mockResolvedValue(false);
    const onCopy = vi.fn();
    render(<CopyButton text="secret" onCopy={onCopy} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => expect(onCopy).toHaveBeenCalledWith(false));
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });
});
