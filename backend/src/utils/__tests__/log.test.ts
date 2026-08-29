import { describe, it, expect, vi, afterEach } from 'vitest';
import logger from '../log';

const callLog = (level: 'info' | 'warn' | 'error', ...args: Parameters<typeof logger.info>): string => {
  const out =
    level === 'error'
      ? vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
      : vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

  logger[level](...args);
  expect(out).toHaveBeenCalledOnce();

  const written = out.mock.calls[0][0] as string;
  out.mockRestore();
  return written;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('log secret sanitization', () => {
  it('redacts keys matching secret', () => {
    const line = callLog('info', 'msg', { secret: 'hunter2' });
    const parsed = JSON.parse(line);
    expect(parsed.secret).toBe('[REDACTED]');
  });

  it('redacts keys matching password', () => {
    const line = callLog('info', 'msg', { password: 'p@ss' });
    const parsed = JSON.parse(line);
    expect(parsed.password).toBe('[REDACTED]');
  });

  it('redacts keys matching token', () => {
    const line = callLog('info', 'msg', { accessToken: 'abc.def.ghi' });
    const parsed = JSON.parse(line);
    expect(parsed.accessToken).toBe('[REDACTED]');
  });

  it('redacts keys matching key and auth', () => {
    const line = callLog('warn', 'msg', { apiKey: 'k', authHeader: 'Bearer x' });
    const parsed = JSON.parse(line);
    expect(parsed.apiKey).toBe('[REDACTED]');
    expect(parsed.authHeader).toBe('[REDACTED]');
  });

  it('redacts keys matching authorization', () => {
    const line = callLog('info', 'msg', { authorization: 'secret' });
    const parsed = JSON.parse(line);
    expect(parsed.authorization).toBe('[REDACTED]');
  });

  it('leaves normal keys untouched', () => {
    const context = { message: 'hello', count: 3, nested: { id: 'x' } };
    const line = callLog('info', 'msg', context);
    const parsed = JSON.parse(line);
    expect(parsed.message).toBe('hello');
    expect(parsed.count).toBe(3);
    expect(parsed.nested).toEqual({ id: 'x' });
  });

  it('redacts sensitive keys only, leaving normal keys intact in the same entry', () => {
    const line = callLog('warn', 'syncing', { userId: 7, sessionToken: 'tok' });
    const parsed = JSON.parse(line);
    expect(parsed.userId).toBe(7);
    expect(parsed.sessionToken).toBe('[REDACTED]');
  });

  it('redacts any key containing the sensitive substring, regardless of position', () => {
    const line = callLog('info', 'msg', { monKey: 'bar' });
    const parsed = JSON.parse(line);
    // "monKey" contains "key" case-insensitively, so it is redacted per the regex.
    expect(parsed.monKey).toBe('[REDACTED]');
  });

  it('emits valid single-line JSON', () => {
    const line = callLog('error', 'exploded', { password: 'x', pid: 123 });
    expect(line.endsWith('\n')).toBe(true);
    expect(JSON.parse(line)).toMatchObject({
      level: 'error',
      message: 'exploded',
      password: '[REDACTED]',
      pid: 123,
    });
    expect(() => JSON.parse(line)).not.toThrow();
    expect(line.split('\n')).toHaveLength(2);
  });

  it('includes level, message and timestamp in every entry', () => {
    const line = callLog('info', 'hello world');
    const parsed = JSON.parse(line);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('hello world');
    expect(typeof parsed.timestamp).toBe('string');
    expect(new Date(parsed.timestamp).getTime()).not.toBeNaN();
  });

  it('writes to stderr for error level', () => {
    const spied = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    logger.error('bad', { token: 't' });
    expect(spied).toHaveBeenCalledOnce();
    spied.mockRestore();
  });
});