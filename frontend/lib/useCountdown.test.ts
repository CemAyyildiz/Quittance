import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useCountdown from './useCountdown';

const NOW = new Date('2024-06-15T12:00:00.000Z');

interface HookHarnessProps {
  expiresAt: string | Date | null | undefined;
  onValue: (value: string) => void;
}

function HookHarness({ expiresAt, onValue }: HookHarnessProps): ReactNode {
  onValue(useCountdown(expiresAt));
  return null;
}

function renderCountdown(expiresAt: HookHarnessProps['expiresAt']) {
  const container = document.createElement('div');
  const root: Root = createRoot(container);
  let value = '';

  act(() => {
    root.render(
      createElement(HookHarness, {
        expiresAt,
        onValue: (nextValue: string) => {
          value = nextValue;
        },
      }),
    );
  });

  return {
    get value() {
      return value;
    },
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCountdown', () => {
  it('returns an empty label for null input', () => {
    const countdown = renderCountdown(null);

    expect(countdown.value).toBe('');
    expect(vi.getTimerCount()).toBe(0);

    countdown.unmount();
  });

  it('updates a future expiry using the countdown interval', () => {
    const countdown = renderCountdown(new Date(NOW.getTime() + 65_000));

    expect(countdown.value).toBe('1m 5s');
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(countdown.value).toBe('1m 4s');

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(countdown.value).toBe('4s');

    countdown.unmount();
  });

  it('reports a past expiry immediately and schedules no timer', () => {
    const countdown = renderCountdown(new Date(NOW.getTime() - 1_000));

    expect(countdown.value).toBe('Expired');
    expect(vi.getTimerCount()).toBe(0);

    countdown.unmount();
  });

  it('clears the pending timer on unmount', () => {
    const countdown = renderCountdown(new Date(NOW.getTime() + 10 * 60_000));

    expect(vi.getTimerCount()).toBe(1);

    countdown.unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
