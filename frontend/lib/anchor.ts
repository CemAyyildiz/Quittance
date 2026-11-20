/**
 * Build and sign the single Soroban transaction that writes a receipt anchor.
 * The frontend holds the wallet: the server only computes/validates the
 * canonical digest and records the resulting transaction hash.
 */
import { Contract, TransactionBuilder, BASE_FEE, nativeToScVal } from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

import { loadAccount, getUserPublicKey, NETWORK_PASSPHRASE, server } from './stellar';

export function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('Anchor digest must be 32 bytes of hex');
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Build the raw (unsigned) XDR for `anchor(invoice_id: String, digest: Bytes)`. */
export function buildAnchorTransactionXdr(
  account: any,
  contractId: string,
  invoiceId: string,
  digestHex: string,
): string {
  const contract = new Contract(contractId);
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'anchor',
        nativeToScVal(invoiceId, { type: 'string' }),
        nativeToScVal(hexToBytes(digestHex), { type: 'bytes' }),
      ),
    )
    .setTimeout(180)
    .build()
    .toXDR();
}

/** Ask Freighter to sign and submit the anchor transaction. Returns its hash. */
export async function submitAnchorTransaction(
  contractId: string,
  invoiceId: string,
  digestHex: string,
): Promise<string> {
  const publicKey = await getUserPublicKey();
  if (!publicKey) throw new Error('Connect your wallet first');

  const account = await loadAccount(publicKey);
  const xdr = buildAnchorTransactionXdr(account, contractId, invoiceId, digestHex);
  const signedXdr = await signTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await server.submitTransaction(signedTx as any);
  return result.hash;
}
