import { describe, it, expect } from 'vitest';
import mapHorizonError, {
  mapHorizonError as namedMapHorizonError,
  horizonErrorMessage,
  extractHorizonCode,
} from './horizonErrorMap';

describe('mapHorizonError — happy path', () => {
  it('maps a known operation-level code to its English message', () => {
    const result = mapHorizonError('op_underfunded');
    expect(result.known).toBe(true);
    expect(result.code).toBe('op_underfunded');
    expect(result.message).toBe(
      'The sending account does not have enough balance for this payment.',
    );
  });

  it('maps a known transaction-level code', () => {
    const result = mapHorizonError('tx_bad_seq');
    expect(result.known).toBe(true);
    expect(result.message).toContain('sequence number');
  });

  it('is case-insensitive and trims surrounding whitespace', () => {
    const result = mapHorizonError('  TX_BAD_SEQ ');
    expect(result.known).toBe(true);
    expect(result.code).toBe('tx_bad_seq');
  });

  it('maps HTTP-style Horizon conditions', () => {
    expect(mapHorizonError('rate_limit_exceeded').known).toBe(true);
    expect(mapHorizonError('not_found').message).toContain('not found');
  });

  it('exposes the same function as default and named export', () => {
    expect(namedMapHorizonError).toBe(mapHorizonError);
  });
});

describe('mapHorizonError — invalid input', () => {
  it('falls back for an unknown code but preserves the normalized code', () => {
    const result = mapHorizonError('op_totally_made_up');
    expect(result.known).toBe(false);
    expect(result.code).toBe('op_totally_made_up');
    expect(result.message).toBe(
      'An unknown Horizon error occurred. Please try again.',
    );
  });

  it('falls back for null with an "unknown" code', () => {
    const result = mapHorizonError(null);
    expect(result.known).toBe(false);
    expect(result.code).toBe('unknown');
  });

  it('falls back for undefined', () => {
    expect(mapHorizonError(undefined).known).toBe(false);
  });

  it('falls back for an empty or whitespace-only string', () => {
    expect(mapHorizonError('').known).toBe(false);
    expect(mapHorizonError('   ').known).toBe(false);
  });

  it('falls back for non-string types', () => {
    expect(mapHorizonError(42 as unknown).known).toBe(false);
    expect(mapHorizonError({} as unknown).known).toBe(false);
    expect(mapHorizonError([] as unknown).known).toBe(false);
  });
});

describe('horizonErrorMessage', () => {
  it('returns just the message string for a known code', () => {
    expect(horizonErrorMessage('op_no_trust')).toBe(
      'The destination account has no trustline for this asset.',
    );
  });

  it('returns the fallback message for invalid input', () => {
    expect(horizonErrorMessage(undefined)).toBe(
      'An unknown Horizon error occurred. Please try again.',
    );
  });
});

describe('extractHorizonCode', () => {
  it('extracts the first operation-level code from a raw error object', () => {
    const error = { extras: { result_codes: { operations: ['op_no_trust'] } } };
    expect(extractHorizonCode(error)).toBe('op_no_trust');
  });

  it('skips empty operation entries and picks the first meaningful one', () => {
    const error = {
      extras: { result_codes: { operations: ['', 'op_underfunded'] } },
    };
    expect(extractHorizonCode(error)).toBe('op_underfunded');
  });

  it('falls back to the transaction-level code when no operation code exists', () => {
    const error = { extras: { result_codes: { transaction: 'tx_failed' } } };
    expect(extractHorizonCode(error)).toBe('tx_failed');
  });

  it('peels an axios-style response.data wrapper', () => {
    const error = {
      response: { data: { extras: { result_codes: { transaction: 'tx_bad_seq' } } } },
    };
    expect(extractHorizonCode(error)).toBe('tx_bad_seq');
  });

  it('returns null when no code can be found', () => {
    expect(extractHorizonCode({})).toBeNull();
    expect(extractHorizonCode({ extras: {} })).toBeNull();
    expect(extractHorizonCode(null)).toBeNull();
    expect(extractHorizonCode('nope' as unknown)).toBeNull();
  });

  it('composes with mapHorizonError end to end', () => {
    const error = { extras: { result_codes: { operations: ['op_line_full'] } } };
    const code = extractHorizonCode(error);
    expect(mapHorizonError(code).message).toContain('balance limit');
  });
});
