import * as StellarSdk from '@stellar/stellar-sdk';
import { server, NETWORK_PASSPHRASE, getSellerKeypair } from '../config/stellar';

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

class StellarService {
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
      throw new Error(`Transaction not found: ${error.message}`);
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

