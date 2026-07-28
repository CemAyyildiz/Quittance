import test from 'node:test';
import assert from 'node:assert/strict';

import { createInvoiceSchema, stellarPublicKeySchema } from './validation';

const validSellerPublicKey = 'G' + 'A'.repeat(55);

test('valid invoice payload passes validation', () => {
  const result = createInvoiceSchema.safeParse({
    amount: 125,
    description: 'Website redesign',
    customerName: 'Alice Example',
    customerEmail: 'alice@example.com',
    sellerName: 'Quittance Labs',
    sellerEmail: 'seller@example.com',
    expiresInDays: 14,
    sellerPublicKey: validSellerPublicKey,
  });

  assert.equal(result.success, true);
});

test('invalid invoice amount fails validation', () => {
  const result = createInvoiceSchema.safeParse({
    amount: 0,
    sellerPublicKey: validSellerPublicKey,
  });

  assert.equal(result.success, false);
  if (result.success) {
    assert.fail('Expected invalid amount to fail validation');
  }

  assert.ok(
    result.error.issues.some((issue) => issue.path.includes('amount')),
    'Expected the amount field to be reported in the validation issues',
  );
});

test('invalid stellar public key fails validation', () => {
  const result = stellarPublicKeySchema.safeParse('not-a-valid-public-key');

  assert.equal(result.success, false);
  if (result.success) {
    assert.fail('Expected an invalid public key to fail validation');
  }

  assert.ok(
    result.error.issues.some((issue) => issue.message.includes('Invalid Stellar public key format')),
    'Expected a clear Stellar public key validation message',
  );
});

test('invalid customer email fails validation', () => {
  const result = createInvoiceSchema.safeParse({
    amount: 10,
    customerEmail: 'not-an-email',
    sellerPublicKey: validSellerPublicKey,
  });

  assert.equal(result.success, false);
  if (result.success) {
    assert.fail('Expected an invalid email to fail validation');
  }

  assert.ok(
    result.error.issues.some((issue) => issue.path.includes('customerEmail')),
    'Expected the customerEmail field to be reported in the validation issues',
  );
});
