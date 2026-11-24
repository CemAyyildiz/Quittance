import * as StellarSdk from '@stellar/stellar-sdk';
import { server, NETWORK_PASSPHRASE, getSellerKeypair, STELLAR_HORIZON_URL } from '../config/stellar';
import { VerifyErrorCode } from '../utils/verify-errors';

/** Result of checking a seller account before creating an invoice. */
export type SellerAssetReadiness =
  | { ok: true }
  | { ok: false; reason: 'no-trustline'; warning: string };

/** The seller account has never been funded (Horizon 404). */
export class UnfundedAccountError extends Error {
  constructor(public readonly publicKey: string) {
    super(`Seller account ${publicKey} is not funded on the Stellar network`);
    this.name = 'UnfundedAccountError';
  }
}

/** Horizon could not be reached; nothing should be created. */
export class HorizonUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Horizon is unavailable; cannot check the seller account');
    this.name = 'HorizonUnavailableError';
    this.cause = cause;
  }
}

/**
 * Decide whether a set of Horizon balances includes an exact (code, issuer)
 * trustline. Kept pure so the wrong-issuer and missing-line cases are directly
 * testable without a network round trip.
 */
export function sellerAssetReadinessFromBalances(
  balances: Array<Record<string, any>>,
  assetCode: string,
  assetIssuer?: string,
): SellerAssetReadiness {
  if (assetCode === 'XLM') {
    return { ok: true }; // native XLM only needs an existing account
  }

  const hasTrustline = balances.some(
    (balance) =>
      balance.asset_type !== 'native' &&
      balance.asset_code === assetCode &&
      balance.asset_issuer === assetIssuer,
  );

  if (hasTrustline) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: 'no-trustline',
    warning:
      `The seller account has no trustline for ${assetCode}` +
      (assetIssuer ? ` issued by ${assetIssuer}` : '') +
      `. Add this asset in Freighter before sharing an ${assetCode} invoice.`,
  };
}

export interface PaymentRecord {
  id: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  assetCode: string;
  assetIssuer?: string;
  memo?: string;
  memoType?: string;
  ledger: number;
  createdAt: string;
}

/** Result of a short Horizon reachability probe used by /health/detail. */
export interface HorizonHealthResult {
  reachable: boolean;
  latestLedger?: number;
}

/** Default probe timeout — slow Horizon must become 503, not a hung request. */
const HORIZON_HEALTH_TIMEOUT_MS = 3000;

class StellarService {
  /**
   * Probe Horizon with a short timeout via the root endpoint.
   * Returns the latest ledger sequence on success; never throws.
   */
  async checkHorizonHealth(
    timeoutMs: number = HORIZON_HEALTH_TIMEOUT_MS
  ): Promise<HorizonHealthResult> {
    const baseUrl = STELLAR_HORIZON_URL.replace(/\/$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        return { reachable: false };
      }

      const body = (await response.json()) as {
        history_latest_ledger?: number;
        core_latest_ledger?: number;
      };

      const latestLedger = Number(
        body.history_latest_ledger ?? body.core_latest_ledger
      );

      if (!Number.isFinite(latestLedger) || latestLedger <= 0) {
        return { reachable: false };
      }

      return { reachable: true, latestLedger };
    } catch {
      return { reachable: false };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Load account details from Stellar network
   */
  async loadAccount(publicKey: string): Promise<StellarSdk.Horizon.AccountResponse> {
    try {
      return await server.loadAccount(publicKey);
    } catch (error: any) {
      console.error(`Error loading account ${publicKey}:`, error);
      throw new Error(`Account not found or network error: ${error.message}`);
    }
  }

  /**
   * Check the seller account on Horizon before an invoice is created.
   *
   * - Native XLM only requires the account to exist (and be funded).
   * - A credit asset requires a trustline for the exact (code, issuer) pair;
   *   a same-code/different-issuer line does not count.
   * - An unfunded account is a hard error, not a warning.
   * - A Horizon outage is surfaced as `HorizonUnavailableError` (HTTP 503).
   */
  async checkSellerAccountForAsset(
    publicKey: string,
    assetCode: string,
    assetIssuer?: string,
  ): Promise<SellerAssetReadiness> {
    let account: StellarSdk.Horizon.AccountResponse;
    try {
      account = await server.loadAccount(publicKey);
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      const notFound =
        status === 404 || /not\s*found|not_found/i.test(String(error?.message ?? ''));
      if (notFound) {
        throw new UnfundedAccountError(publicKey);
      }
      throw new HorizonUnavailableError(error);
    }

    return sellerAssetReadinessFromBalances(
      account.balances as Array<Record<string, any>>,
      assetCode,
      assetIssuer,
    );
  }

  // Alias used by callers that prefer the shorter name.
  checkSellerAssetReadiness = this.checkSellerAccountForAsset;

  /**
   * Get account balance
   */
  async getBalance(publicKey: string): Promise<Array<{ assetCode: string; balance: string }>> {
    const account = await this.loadAccount(publicKey);
    return account.balances.map((balance: any) => ({
      assetCode: balance.asset_type === 'native' ? 'XLM' : balance.asset_code,
      balance: balance.balance,
    }));
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(txHash: string, expectedMemo: string, expectedAmount: string): Promise<boolean> {
    try {
      const transaction = await server.transactions().transaction(txHash).call();
      
      // Check memo
      if (transaction.memo !== expectedMemo) {
        console.log('Memo mismatch:', { expected: expectedMemo, actual: transaction.memo });
        return false;
      }

      // Get operations
      const operations = await server.operations().forTransaction(txHash).call();
      
      // Find payment operation
      const paymentOp = operations.records.find(
        (op: any) => op.type === 'payment' && op.amount === expectedAmount
      );

      return !!paymentOp;
    } catch (error: any) {
      console.error('Payment verification error:', error);
      return false;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(txHash: string): Promise<any> {
    try {
      const transaction = await server.transactions().transaction(txHash).call();
      const operations = await server.operations().forTransaction(txHash).call();
      
      return {
        transaction,
        operations: operations.records,
      };
    } catch (error: any) {
      console.error('Error fetching transaction:', error);
      const failure: Error & { code?: string } = new Error(
        `Transaction not found: ${error.message}`
      );
      // A Horizon 404 means the hash is unknown (possibly still pending).
      // Callers branch on `code` to tell it apart from other Horizon failures.
      if (error?.response?.status === 404 || error?.name === 'NotFoundError') {
        failure.code = VerifyErrorCode.TX_NOT_FOUND;
      }
      throw failure;
    }
  }

  /**
   * Stream payments for a specific account
   */
  streamPayments(
    publicKey: string,
    onPayment: (payment: PaymentRecord) => void,
    onError?: (error: Error) => void
  ) {
    console.log(`🔄 Starting payment stream for account: ${publicKey}`);

    const closeHandler = server
      .payments()
      .forAccount(publicKey)
      .cursor('now')
      .stream({
        onmessage: async (record: any) => {
          try {
            if (record.type === 'payment' && record.to === publicKey) {
              // Get transaction to retrieve memo
              const transaction = await server.transactions().transaction(record.transaction_hash).call();

              const payment: PaymentRecord = {
                id: record.id,
                txHash: record.transaction_hash,
                from: record.from,
                to: record.to,
                amount: record.amount,
                assetCode: record.asset_type === 'native' ? 'XLM' : (record.asset_code ?? 'UNKNOWN'),
                assetIssuer: record.asset_issuer,
                memo: transaction.memo || undefined,
                memoType: transaction.memo_type || undefined,
                ledger: Number(record.ledger ?? 0),
                createdAt: record.created_at,
              };

              console.log('📥 Payment received:', payment);
              onPayment(payment);
            }
          } catch (error: any) {
            console.error('Error processing payment:', error);
            if (onError) onError(error);
          }
        },
        onerror: (error: any) => {
          console.error('❌ Payment stream error:', error);
          if (onError) onError(error);
        },
      });

    return closeHandler;
  }

  /**
   * Get recent payments for an account
   */
  async getRecentPayments(publicKey: string, limit: number = 10): Promise<PaymentRecord[]> {
    try {
      const payments = await server
        .payments()
        .forAccount(publicKey)
        .order('desc')
        .limit(limit)
        .call();

      const paymentRecords: PaymentRecord[] = [];

      for (const record of payments.records) {
        if (record.type === 'payment') {
          const transaction = await server.transactions().transaction(record.transaction_hash).call();

          paymentRecords.push({
            id: record.id,
            txHash: record.transaction_hash,
            from: record.from,
            to: record.to,
            amount: record.amount,
            assetCode: record.asset_type === 'native' ? 'XLM' : (record.asset_code ?? 'UNKNOWN'),
            assetIssuer: record.asset_issuer,
            memo: transaction.memo || undefined,
            memoType: transaction.memo_type || undefined,
            ledger: Number((record as any).ledger_attr ?? 0),
            createdAt: record.created_at,
          });
        }
      }

      return paymentRecords;
    } catch (error: any) {
      console.error('Error fetching recent payments:', error);
      throw new Error(`Failed to fetch payments: ${error.message}`);
    }
  }

  /**
   * Create and submit a payment transaction
   */
  async sendPayment(
    destination: string,
    amount: string,
    memo: string,
    assetCode: string = 'XLM',
    assetIssuer?: string
  ): Promise<string> {
    try {
      const sourceKeypair = getSellerKeypair();
      const sourceAccount = await this.loadAccount(sourceKeypair.publicKey());

      const asset = assetCode === 'XLM'
        ? StellarSdk.Asset.native()
        : new StellarSdk.Asset(assetCode, assetIssuer!);

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination,
            asset,
            amount,
          })
        )
        .addMemo(StellarSdk.Memo.text(memo))
        .setTimeout(180)
        .build();

      transaction.sign(sourceKeypair);

      const result = await server.submitTransaction(transaction);
      console.log('✅ Payment sent:', result.hash);
      return result.hash;
    } catch (error: any) {
      console.error('Error sending payment:', error);
      throw new Error(`Payment failed: ${error.message}`);
    }
  }
}

export default new StellarService();

