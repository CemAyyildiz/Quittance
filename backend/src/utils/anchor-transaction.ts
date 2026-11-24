/**
 * Verify that a transaction hash really is the seller's on-chain anchor call.
 *
 * The backend never signs, so the only evidence it has for an anchor is the
 * Horizon transaction. Accepting any 64-hex string would let a caller claim an
 * anchor that never happened (and, because an invoice can only be anchored
 * once, permanently block the seller from anchoring the real proof). This
 * module checks the returned transaction and operation shape without any
 * network access so it can be unit-tested with plain objects.
 */
import * as StellarSdk from '@stellar/stellar-sdk';

export type AnchorTransactionFailure =
  | 'TRANSACTION_FAILED'
  | 'WRONG_SOURCE'
  | 'NO_ANCHOR_OPERATION';

export type AnchorTransactionCheck =
  | { ok: true }
  | { ok: false; reason: AnchorTransactionFailure };

/** Decode a Horizon ScVal argument (base64 XDR string) safely. */
function decodeArg(arg: unknown): StellarSdk.xdr.ScVal | undefined {
  if (typeof arg !== 'string') return undefined;
  try {
    return StellarSdk.xdr.ScVal.fromXDR(arg, 'base64');
  } catch {
    return undefined;
  }
}

function scValString(value: StellarSdk.xdr.ScVal | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const raw = value.str();
    return Buffer.isBuffer(raw) ? raw.toString('utf8') : raw;
  } catch {
    return undefined;
  }
}

function scValHex(value: StellarSdk.xdr.ScVal | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return value.bytes().toString('hex');
  } catch {
    return undefined;
  }
}

/**
 * True when `operations` contains the `anchor(invoice_id, digest)` invocation
 * for `contractId` with exactly the expected arguments.
 */
export function anchorOperationMatches(input: {
  operations: any[];
  contractId: string;
  invoiceId: string;
  digest: string;
}): AnchorTransactionCheck {
  const expectedDigest = input.digest.trim().toLowerCase();

  for (const operation of input.operations ?? []) {
    if (operation?.type !== 'invoke_host_function') continue;

    const fn = operation.function;
    const invoke = fn?.invoke_contract;
    if (!invoke) continue;

    const contractId = invoke.contract_id ?? invoke.contract;
    if (contractId !== input.contractId) continue;

    const functionName = invoke.function_name;
    if (functionName !== 'anchor') continue;

    const args: unknown[] = invoke.args ?? [];
    const invoiceId = scValString(decodeArg(args[0]));
    if (invoiceId !== input.invoiceId) continue;

    const digest = scValHex(decodeArg(args[1]));
    if (digest !== expectedDigest) continue;

    return { ok: true };
  }

  return { ok: false, reason: 'NO_ANCHOR_OPERATION' };
}

/**
 * Validate a Horizon transaction receipt as the anchor for this invoice.
 *
 * The transaction must be successful, sourced by the owning seller's wallet,
 * and contain the expected `anchor(invoice_id, digest)` contract call.
 */
export function verifyAnchorTransaction(input: {
  transaction: any;
  operations: any[];
  sellerPublicKey: string;
  contractId: string;
  invoiceId: string;
  digest: string;
}): AnchorTransactionCheck {
  const { transaction } = input;

  if (!transaction || transaction.successful === false) {
    return { ok: false, reason: 'TRANSACTION_FAILED' };
  }

  if (transaction.source_account && transaction.source_account !== input.sellerPublicKey) {
    return { ok: false, reason: 'WRONG_SOURCE' };
  }

  const match = anchorOperationMatches({
    operations: input.operations,
    contractId: input.contractId,
    invoiceId: input.invoiceId,
    digest: input.digest,
  });

  return match.ok ? match : { ok: false, reason: match.reason };
}
