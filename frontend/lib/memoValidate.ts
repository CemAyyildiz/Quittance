export interface MemoValidationResult {
  valid: boolean;
  error?: string;
}

export function memoValidate(memo: unknown): MemoValidationResult {
  if (typeof memo !== 'string') {
    return { valid: false, error: 'Memo must be a string.' };
  }

  if (memo.length === 0) {
    return { valid: false, error: 'Memo cannot be empty.' };
  }

  const byteLength = new TextEncoder().encode(memo).length;

  if (byteLength > 28) {
    return { valid: false, error: 'Memo exceeds maximum byte length of 28 bytes.' };
  }

  return { valid: true };
}
