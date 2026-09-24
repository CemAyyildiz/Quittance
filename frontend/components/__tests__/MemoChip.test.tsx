import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MemoChip from '../MemoChip';

describe('MemoChip', () => {
  it('renders short memo without truncation', () => {
    const html = renderToStaticMarkup(<MemoChip memo="Hello" />);
    expect(html).toContain('Hello');
    expect(html).not.toContain('...');
    expect(html).toContain('title="Hello"');
    expect(html).toContain('aria-label="Memo: Hello"');
  });

  it('truncates long memo and preserves full text in title and aria-label', () => {
    const longMemo = 'This is a very long memo that exceeds twenty-four characters';
    const html = renderToStaticMarkup(<MemoChip memo={longMemo} />);
    expect(html).toContain('...');
    expect(html).not.toContain(longMemo + '<');
    expect(html).toContain(`title="${longMemo}"`);
    expect(html).toContain(`aria-label="Memo: ${longMemo}"`);
  });

  it('truncates at the default maxLength of 24', () => {
    const memo24 = '123456789012345678901234'; // 24 chars
    const memo25 = memo24 + '5'; // 25 chars

    const htmlShort = renderToStaticMarkup(<MemoChip memo={memo24} />);
    expect(htmlShort).not.toContain('...');

    const htmlLong = renderToStaticMarkup(<MemoChip memo={memo25} />);
    expect(htmlLong).toContain('123456789012345678901234...');
  });

  it('supports custom maxLength', () => {
    const memo10 = '1234567890'; // 10 chars
    const memo11 = memo10 + '1'; // 11 chars

    const htmlShort = renderToStaticMarkup(
      <MemoChip memo={memo11} maxLength={11} />,
    );
    expect(htmlShort).not.toContain('...');

    const htmlLong = renderToStaticMarkup(
      <MemoChip memo={memo11} maxLength={5} />,
    );
    expect(htmlLong).toContain('12345...');
    expect(htmlLong).toContain(`title="${memo11}"`);
    expect(htmlLong).toContain(`aria-label="Memo: ${memo11}"`);
  });

  it('forwards custom className', () => {
    const html = renderToStaticMarkup(
      <MemoChip memo="Test" className="my-custom-class" />,
    );
    expect(html).toContain('my-custom-class');
  });
});
