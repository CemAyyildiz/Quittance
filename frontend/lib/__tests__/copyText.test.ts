import { describe, it, expect, vi, afterEach } from 'vitest';
import { copyText } from '../copyText';

function mockDocumentFallback() {
  const textarea = { value: '', style: {} as Record<string, string>, select: vi.fn() };
  const createElement = vi.fn().mockReturnValue(textarea);
  const appendChild = vi.fn();
  const removeChild = vi.fn();
  const execCommand = vi.fn();

  vi.stubGlobal('document', {
    createElement,
    body: { appendChild, removeChild },
    execCommand,
  });

  return { textarea, createElement, appendChild, removeChild, execCommand };
}

describe('copyText', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true on successful Clipboard API copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const result = await copyText('hello');

    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('uses fallback when Clipboard API is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    const { textarea, createElement, execCommand, removeChild } = mockDocumentFallback();
    execCommand.mockReturnValue(true);

    const result = await copyText('hello');

    expect(result).toBe(true);
    expect(createElement).toHaveBeenCalledWith('textarea');
    expect(textarea.select).toHaveBeenCalled();
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(removeChild).toHaveBeenCalledWith(textarea);
  });

  it('uses fallback when Clipboard API rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { textarea, execCommand, removeChild } = mockDocumentFallback();
    execCommand.mockReturnValue(true);

    const result = await copyText('hello');

    expect(result).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(removeChild).toHaveBeenCalledWith(textarea);
  });

  it('returns false when fallback also fails', async () => {
    vi.stubGlobal('navigator', {});
    const { execCommand, removeChild } = mockDocumentFallback();
    execCommand.mockReturnValue(false);

    const result = await copyText('hello');

    expect(result).toBe(false);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(removeChild).toHaveBeenCalled();
  });

  it('returns false for empty string', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    await expect(copyText('')).resolves.toBe(false);
  });

  it('returns false for whitespace-only string', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    await expect(copyText('   ')).resolves.toBe(false);
  });

  it('returns false for invalid input types', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    await expect(copyText(null as unknown as string)).resolves.toBe(false);
    await expect(copyText(undefined as unknown as string)).resolves.toBe(false);
  });

  it('cleans up temporary textarea element after fallback', async () => {
    vi.stubGlobal('navigator', {});
    const { textarea, createElement, removeChild } = mockDocumentFallback();
    vi.stubGlobal('document', {
      ...(globalThis as any).document,
      execCommand: vi.fn().mockReturnValue(true),
    });

    await copyText('hello');

    expect(createElement).toHaveBeenCalledWith('textarea');
    expect(removeChild).toHaveBeenCalledWith(textarea);
  });
});
