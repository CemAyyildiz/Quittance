import { describe, expect, it } from 'vitest';
import {
  VerifyErrorCode,
  VerifyErrorMessages,
  verifyErrorMessage,
} from './verify-errors';

describe('verify error responses', () => {
  it('keeps memo mismatch machine-readable with its existing message', () => {
    expect({
      success: false,
      code: VerifyErrorCode.MEMO_MISMATCH,
      error: VerifyErrorMessages[VerifyErrorCode.MEMO_MISMATCH],
    }).toEqual({
      success: false,
      code: 'MEMO_MISMATCH',
      error: 'Memo mismatch',
    });
  });

  it('keeps amount mismatch machine-readable with its existing message', () => {
    expect({
      success: false,
      code: VerifyErrorCode.AMOUNT_MISMATCH,
      error: VerifyErrorMessages[VerifyErrorCode.AMOUNT_MISMATCH],
    }).toEqual({
      success: false,
      code: 'AMOUNT_MISMATCH',
      error: 'Amount mismatch',
    });
  });
});

describe('verifyErrorMessage', () => {
  it('returns non-empty English text for every VerifyErrorCode', () => {
    for (const code of Object.values(VerifyErrorCode)) {
      const message = verifyErrorMessage(code);

      expect(typeof message).toBe('string');
      expect(message.trim().length).toBeGreaterThan(0);
      // "English text" — at least one letter, not just punctuation/whitespace.
      expect(message).toMatch(/[A-Za-z]/);
    }
  });
});
