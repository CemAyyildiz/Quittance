/**
 * Unit tests for horizonStatus — the Stellar Horizon error → English mapper.
 */

import { describe, it, expect } from 'vitest';
import { horizonStatus, HorizonErrorLike } from './horizonStatus';

// ---------------------------------------------------------------------------
// 1. Edge cases — null, undefined, plain strings
// ---------------------------------------------------------------------------
describe('horizonStatus — edge cases', () => {
  it('returns a fallback for null', () => {
    expect(horizonStatus(null)).toBe('An unknown error occurred.');
  });

  it('returns a fallback for undefined', () => {
    expect(horizonStatus(undefined)).toBe('An unknown error occurred.');
  });

  it('passes through a plain string error', () => {
    expect(horizonStatus('Something broke')).toBe('Something broke');
  });

  it('returns a fallback for an empty object', () => {
    expect(horizonStatus({})).toBe(
      'An unexpected error occurred while communicating with the Stellar network.',
    );
  });

  it('returns a fallback for an object with no recognisable fields', () => {
    expect(horizonStatus({ foo: 'bar' })).toBe(
      'An unexpected error occurred while communicating with the Stellar network.',
    );
  });
});

// ---------------------------------------------------------------------------
// 2. HTTP status codes
// ---------------------------------------------------------------------------
describe('horizonStatus — HTTP status codes', () => {
  it('maps 400 to a readable message', () => {
    const err: HorizonErrorLike = { status: 400 };
    const msg = horizonStatus(err);
    expect(msg).toContain('malformed');
  });

  it('maps 404 to a readable message', () => {
    const err: HorizonErrorLike = { status: 404 };
    const msg = horizonStatus(err);
    expect(msg).toContain('could not be found');
  });

  it('maps 429 to a readable message', () => {
    const err: HorizonErrorLike = { status: 429 };
    const msg = horizonStatus(err);
    expect(msg).toContain('Too many requests');
  });

  it('maps 500 to a readable message', () => {
    const err: HorizonErrorLike = { status: 500 };
    const msg = horizonStatus(err);
    expect(msg).toContain('internal error');
  });

  it('maps 503 to a readable message', () => {
    const err: HorizonErrorLike = { status: 503 };
    const msg = horizonStatus(err);
    expect(msg).toContain('temporarily unavailable');
  });

  it('maps 504 to a readable message', () => {
    const err: HorizonErrorLike = { status: 504 };
    const msg = horizonStatus(err);
    expect(msg).toContain('took too long');
  });

  // Axios-style nested status
  it('reads status from response.status (Axios shape)', () => {
    const err: HorizonErrorLike = { response: { status: 404 } };
    const msg = horizonStatus(err);
    expect(msg).toContain('could not be found');
  });

  it('reads status from response.status even with top-level status absent', () => {
    const err: HorizonErrorLike = { response: { status: 503, data: {} } };
    const msg = horizonStatus(err);
    expect(msg).toContain('temporarily unavailable');
  });
});

// ---------------------------------------------------------------------------
// 3. Transaction result codes
// ---------------------------------------------------------------------------
describe('horizonStatus — transaction result codes', () => {
  it('maps tx_bad_auth', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { transaction: 'tx_bad_auth' } },
    };
    expect(horizonStatus(err)).toContain('authentication failed');
  });

  it('maps tx_bad_seq', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { transaction: 'tx_bad_seq' } },
    };
    expect(horizonStatus(err)).toContain('sequence number');
  });

  it('maps tx_insufficient_balance', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { transaction: 'tx_insufficient_balance' } },
    };
    expect(horizonStatus(err)).toContain('Insufficient XLM balance');
  });

  it('maps tx_insufficient_fee', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { transaction: 'tx_insufficient_fee' } },
    };
    expect(horizonStatus(err)).toContain('fee is too low');
  });

  it('maps tx_too_late', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { transaction: 'tx_too_late' } },
    };
    expect(horizonStatus(err)).toContain('expired');
  });

  it('maps tx_too_early', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { transaction: 'tx_too_early' } },
    };
    expect(horizonStatus(err)).toContain('starts in the future');
  });

  it('maps tx_internal_error', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { transaction: 'tx_internal_error' } },
    };
    expect(horizonStatus(err)).toContain('internal error');
  });

  it('maps tx_no_source_account', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { transaction: 'tx_no_source_account' } },
    };
    expect(horizonStatus(err)).toContain('source account');
  });

  it('maps tx_missing_operation', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { transaction: 'tx_missing_operation' } },
    };
    expect(horizonStatus(err)).toContain('no operations');
  });

  // Bare code without tx_ prefix
  it('handles bare tx code (insufficient_balance without tx_ prefix)', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { transaction: 'insufficient_balance' } },
    };
    expect(horizonStatus(err)).toContain('Insufficient XLM balance');
  });
});

// ---------------------------------------------------------------------------
// 4. Operation result codes
// ---------------------------------------------------------------------------
describe('horizonStatus — operation result codes', () => {
  it('maps op_no_trust', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { operations: ['op_no_trust'] } },
    };
    expect(horizonStatus(err)).toContain('no trustline');
  });

  it('maps op_src_no_trust', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { operations: ['op_src_no_trust'] } },
    };
    expect(horizonStatus(err)).toContain('no trustline');
  });

  it('maps op_underfunded', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { operations: ['op_underfunded'] } },
    };
    expect(horizonStatus(err)).toContain('Insufficient balance');
  });

  it('maps op_line_full', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { operations: ['op_line_full'] } },
    };
    expect(horizonStatus(err)).toContain('trustline limit');
  });

  it('maps op_src_not_authorized', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { operations: ['op_src_not_authorized'] } },
    };
    expect(horizonStatus(err)).toContain('not authorized');
  });

  it('maps op_under_dest_min', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { operations: ['op_under_dest_min'] } },
    };
    expect(horizonStatus(err)).toContain('minimum required amount');
  });

  it('maps op_cross_self', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { operations: ['op_cross_self'] } },
    };
    expect(horizonStatus(err)).toContain('own account');
  });

  it('maps op_no_account', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { operations: ['op_no_account'] } },
    };
    expect(horizonStatus(err)).toContain('does not exist');
  });

  // Bare op code without op_ prefix
  it('handles bare op code (no_trust without op_ prefix)', () => {
    const err: HorizonErrorLike = {
      extras: { result_codes: { operations: ['no_trust'] } },
    };
    expect(horizonStatus(err)).toContain('no trustline');
  });

  // Operations list with multiple codes — first match wins
  it('returns the first matching operation code when multiple are present', () => {
    const err: HorizonErrorLike = {
      extras: {
        result_codes: {
          operations: ['op_underfunded', 'op_no_trust'],
        },
      },
    };
    expect(horizonStatus(err)).toContain('Insufficient balance');
  });
});

// ---------------------------------------------------------------------------
// 5. Nested Axios / Horizon SDK shape (response.data.extras)
// ---------------------------------------------------------------------------
describe('horizonStatus — nested response shapes', () => {
  it('reads op result codes from response.data.extras (Axios shape)', () => {
    const err: HorizonErrorLike = {
      response: {
        status: 400,
        data: {
          extras: {
            result_codes: {
              transaction: 'tx_failed',
              operations: ['op_underfunded'],
            },
          },
        },
      },
    };
    // op_underfunded is mapped; should return that rather than the 400 message
    expect(horizonStatus(err)).toContain('Insufficient balance');
  });

  it('reads tx result codes from response.data.extras (Axios shape)', () => {
    const err: HorizonErrorLike = {
      response: {
        status: 400,
        data: {
          extras: {
            result_codes: {
              transaction: 'tx_bad_auth',
              operations: ['op_some_op'],
            },
          },
        },
      },
    };
    // op_some_op not mapped; tx_bad_auth is the fallback in codes
    expect(horizonStatus(err)).toContain('authentication failed');
  });

  it('falls back to HTTP status when no result codes are recognised', () => {
    const err: HorizonErrorLike = {
      response: {
        status: 502,
        data: {
          extras: {
            result_codes: {
              transaction: 'tx_unknown_code',
              operations: ['op_unknown_code'],
            },
          },
        },
      },
    };
    const msg = horizonStatus(err);
    expect(msg).toContain('invalid response');
  });
});

// ---------------------------------------------------------------------------
// 6. title / detail from Horizon error response
// ---------------------------------------------------------------------------
describe('horizonStatus — title and detail messages', () => {
  it('prefers title when no HTTP status or result codes match', () => {
    const err: HorizonErrorLike = { title: 'Transaction Failed' };
    expect(horizonStatus(err)).toBe('Transaction Failed');
  });

  it('combines title and detail', () => {
    const err: HorizonErrorLike = {
      title: 'Transaction Failed',
      detail: 'One or more operations could not be applied.',
    };
    expect(horizonStatus(err)).toBe(
      'Transaction Failed: One or more operations could not be applied.',
    );
  });

  it('reads title from response.data.title', () => {
    const err: HorizonErrorLike = {
      response: { data: { title: 'Not Found' } },
    };
    expect(horizonStatus(err)).toBe('Not Found');
  });
});

// ---------------------------------------------------------------------------
// 7. Fallback to error.message
// ---------------------------------------------------------------------------
describe('horizonStatus — fallback to message', () => {
  it('falls back to error.message when nothing else matches', () => {
    const err: HorizonErrorLike = { message: 'Network Error' };
    expect(horizonStatus(err)).toBe('Network Error');
  });

  it('does not use message if a higher-priority source is available (HTTP status)', () => {
    const err: HorizonErrorLike = {
      status: 404,
      message: 'Network Error',
    };
    expect(horizonStatus(err)).toContain('could not be found');
  });

  it('does not use message if a higher-priority source is available (result code)', () => {
    const err: HorizonErrorLike = {
      message: 'Network Error',
      extras: { result_codes: { transaction: 'tx_too_late' } },
    };
    expect(horizonStatus(err)).toContain('expired');
  });
});

// ---------------------------------------------------------------------------
// 8. Combined scenarios (realistic Horizon error shapes)
// ---------------------------------------------------------------------------
describe('horizonStatus — real-world Horizon error shapes', () => {
  it('handles a full Axios Horizon 400 with underfunded op (realistic USDC payment failure)', () => {
    const err: HorizonErrorLike = {
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: {
          title: 'Transaction Failed',
          detail: '',
          extras: {
            result_codes: {
              transaction: 'tx_failed',
              operations: ['op_underfunded'],
            },
          },
        },
      },
    };
    expect(horizonStatus(err)).toContain('Insufficient balance');
  });

  it('handles a full Axios Horizon 400 with no_trust op (destination missing trustline)', () => {
    const err: HorizonErrorLike = {
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: {
          title: 'Transaction Failed',
          extras: {
            result_codes: {
              transaction: 'tx_failed',
              operations: ['op_no_trust'],
            },
          },
        },
      },
    };
    expect(horizonStatus(err)).toContain('no trustline');
  });

  it('handles a Horizon SDK-style error with just title for a 500', () => {
    // When Horizon returns an internal error with no enriched result codes
    const err: HorizonErrorLike = {
      response: {
        status: 500,
        data: { title: 'Internal Server Error' },
      },
    };
    expect(horizonStatus(err)).toContain('internal error');
  });

  it('handles a Horizon rate-limit error (429)', () => {
    const err: HorizonErrorLike = {
      response: {
        status: 429,
        data: { title: 'Rate Limit Exceeded' },
      },
    };
    expect(horizonStatus(err)).toContain('Too many requests');
  });

  it('handles an unknown transaction code gracefully by falling to title', () => {
    const err: HorizonErrorLike = {
      response: {
        status: 400,
        data: {
          title: 'Transaction Failed',
          extras: {
            result_codes: {
              transaction: 'tx_weird_new_code',
              operations: [],
            },
          },
        },
      },
    };
    // Falls back to title since code isn't in our map
    expect(horizonStatus(err)).toBe('Transaction Failed');
  });
});
