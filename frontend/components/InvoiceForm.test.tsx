import { describe, expect, it, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import InvoiceForm from './InvoiceForm';

function amountInput(html: string) {
  const match = html.match(/<input[^>]*type="number"[^>]*>/);
  expect(match).not.toBeNull();
  return match![0];
}

afterEach(() => {
  cleanup();
});

describe('InvoiceForm amount validation a11y wiring', () => {
  it('does not reference an error element on the amount input while the amount is valid', () => {
    const html = renderToStaticMarkup(<InvoiceForm />);

    expect(amountInput(html)).toContain('aria-invalid="false"');
    expect(amountInput(html)).not.toContain('aria-describedby');
  });

  it('renders no amount error element while the amount is valid', () => {
    const html = renderToStaticMarkup(<InvoiceForm />);

    expect(amountInput(html)).not.toContain('aria-describedby');
    expect(html).not.toContain('id="amount-error"');
  });
});

describe('InvoiceForm amount validation onChange', () => {
  const AMOUNT_PLACEHOLDER = '10.00';
  const AMOUNT_ERROR = 'Amount must be greater than 0';

  function renderAmountField() {
    render(<InvoiceForm />);
    return screen.getByPlaceholderText(AMOUNT_PLACEHOLDER) as HTMLInputElement;
  }

  /**
   * jsdom applies the number-input value-sanitization algorithm, which reduces
   * a non-numeric string like "abc" to "". Override the value IDL attribute so
   * the change event carries the raw text a user could paste, while leaving the
   * input as type="number".
   */
  function changeAmountTo(input: HTMLInputElement, value: string) {
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => value,
      set: () => {},
    });
    fireEvent.change(input, { bubbles: true });
  }

  it('shows the amount error when the value is 0', () => {
    const amount = renderAmountField();

    fireEvent.change(amount, { target: { value: '0' } });

    expect(screen.getByText(AMOUNT_ERROR)).toBeTruthy();
    expect(amount.getAttribute('aria-invalid')).toBe('true');
  });

  it('shows the amount error when the value is negative', () => {
    const amount = renderAmountField();

    fireEvent.change(amount, { target: { value: '-5' } });

    expect(screen.getByText(AMOUNT_ERROR)).toBeTruthy();
    expect(amount.getAttribute('aria-invalid')).toBe('true');
  });

  it('shows the amount error when the value is not a number', () => {
    const amount = renderAmountField();

    changeAmountTo(amount, 'abc');

    expect(screen.getByText(AMOUNT_ERROR)).toBeTruthy();
    expect(amount.getAttribute('aria-invalid')).toBe('true');
  });

  it('clears the amount error when the field is emptied', () => {
    const amount = renderAmountField();

    fireEvent.change(amount, { target: { value: '0' } });
    expect(screen.getByText(AMOUNT_ERROR)).toBeTruthy();

    fireEvent.change(amount, { target: { value: '' } });

    expect(screen.queryByText(AMOUNT_ERROR)).toBeNull();
    expect(amount.getAttribute('aria-invalid')).toBe('false');
  });

  it('shows no amount error for a valid positive amount', () => {
    const amount = renderAmountField();

    fireEvent.change(amount, { target: { value: '5' } });

    expect(screen.queryByText(AMOUNT_ERROR)).toBeNull();
    expect(amount.getAttribute('aria-invalid')).toBe('false');
  });
});
