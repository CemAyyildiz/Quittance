import { describe, expect, it } from 'vitest';
import {
  VerifyErrorCode,
  VerifyErrorMessages,
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
