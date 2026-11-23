import { describe, expect, it } from 'vitest';
import { parseAmount } from './amountParse';

describe('parseAmount', () => {
  it.each([
    ['10.5', '10.5'],
    ['10,5', '10.5'],
    [' 0,0000001 ', '0.0000001'],
    ['10', '10'],
  ])('normalizes %j to %j', (input, expected) => expect(parseAmount(input)).toBe(expected));

  it.each(['1.2.3', '1,2,3', '1,2.3', '', '   ', '1.12345678', '-1', 'abc'])(
    'rejects %j', (input) => expect(parseAmount(input)).toBeUndefined(),
  );
});
