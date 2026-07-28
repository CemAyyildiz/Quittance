import * as StellarSdk from '@stellar/stellar-sdk';
import {
  isConnected,
  getPublicKey,
  signTransaction,
  isAllowed,
  setAllowed,
} from '@stellar/freighter-api';

// Network configuration
const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET';
const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ||
  (STELLAR_NETWORK === 'TESTNET'
    ? 'https://horizon-testnet.stellar.org'
    : 'https://horizon.stellar.org');

export const NETWORK_PASSPHRASE =
  STELLAR_NETWORK === 'TESTNET'
    ? StellarSdk.Networks.TESTNET
    : StellarSdk.Networks.PUBLIC;

export const server = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * Check if Freighter wallet is available and connected
 */
export const checkWalletConnection = async (): Promise<boolean> => {
  try {
    return await isConnected();
  } catch (error) {
    console.error('Error checking wallet connection:', error);
    return false;
  }
};

/**
 * Request permission to access wallet
 */
export const requestWalletAccess = async (): Promise<boolean> => {
  try {
    await setAllowed();
    return await isAllowed();
  } catch (error) {
    console.error('Error requesting wallet access:', error);
    return false;
  }
};

/**
 * Get user's public key from wallet
 */
export const getUserPublicKey = async (): Promise<string | null> => {
  try {
    const publicKey = await getPublicKey();
    return publicKey;
  } catch (error) {
    console.error('Error getting public key:', error);
    return null;
  }
};

/**
 * Load account from Stellar network
 */
export const loadAccount = async (
  publicKey: string
): Promise<StellarSdk.Horizon.AccountResponse> => {
  return await server.loadAccount(publicKey);
};

/**
 * Get account balance
 */
export const getAccountBalance = async (
  publicKey: string
): Promise<Array<{ assetCode: string; balance: string }>> => {
  try {
    const account = await loadAccount(publicKey);
    return account.balances.map((balance: any) => ({
      assetCode: balance.asset_type === 'native' ? 'XLM' : balance.asset_code,
      balance: balance.balance,
    }));
  } catch (error: any) {
    console.error('Error getting balance:', error);
    // If account not found, return empty balance
    if (error.message?.includes('Not Found') || error.response?.status === 404) {
      return [{ assetCode: 'XLM', balance: '0.0000000' }];
    }
    throw error;
  }
};

export type AssetReadiness = 'ok' | 'no-trustline' | 'insufficient-balance';

const getAssetReadiness = (
  balances: any[],
  assetCode: string,
  assetIssuer: string,
  amount?: string
): AssetReadiness => {
  const line = balances.find(
    (balance: any) =>
      balance.asset_code === assetCode && balance.asset_issuer === assetIssuer
  );
  if (!line) {
    return 'no-trustline';
  }
  if (amount && parseFloat(line.balance) < parseFloat(amount)) {
    return 'insufficient-balance';
  }
  return 'ok';
};

/**
 * Check whether an account holds a trustline (and optionally enough balance)
 * for a non-native asset. Used to guide USDC payers before Freighter fails.
 */
export const checkAssetReadiness = async (
  publicKey: string,
  assetCode: string,
  assetIssuer: string,
  amount?: string
): Promise<AssetReadiness> => {
  const account = await loadAccount(publicKey);
  return getAssetReadiness(account.balances as any[], assetCode, assetIssuer, amount);
};

/**
 * Send payment with memo
 */
export const sendPayment = async (
  destination: string,
  amount: string,
  memo: string,
  assetCode: string = 'XLM',
  assetIssuer?: string
): Promise<string> => {
  try {
    // Check wallet connection
    const connected = await checkWalletConnection();
    if (!connected) {
      throw new Error('Wallet not connected');
    }

    // Get user public key
    const userPublicKey = await getUserPublicKey();
    if (!userPublicKey) {
      throw new Error('Could not get user public key');
    }

    // Load account
    let account;
    try {
      account = await loadAccount(userPublicKey);
    } catch (error: any) {
      if (error.message?.includes('Not Found') || error.response?.status === 404) {
        throw new Error('Account not funded. Please get test XLM from Stellar Laboratory first.');
      }
      throw error;
    }

    // Fail fast with clear guidance instead of an opaque Horizon error
    if (assetCode !== 'XLM' && assetIssuer) {
      const readiness = getAssetReadiness(
        account.balances as any[],
        assetCode,
        assetIssuer,
        amount
      );
      if (readiness === 'no-trustline') {
        throw new Error(
          `Your wallet has no ${assetCode} trustline. Add ${assetCode} (issuer ${assetIssuer}) as an asset in Freighter, then try again.`
        );
      }
      if (readiness === 'insufficient-balance') {
        throw new Error(
          `Insufficient ${assetCode} balance to send ${amount} ${assetCode}. Fund your wallet with testnet ${assetCode}, then try again.`
        );
      }
    }

    // Create asset
    const asset =
      assetCode === 'XLM'
        ? StellarSdk.Asset.native()
        : new StellarSdk.Asset(assetCode, assetIssuer!);

    // Build transaction
    const transaction = new StellarSdk.TransactionBuilder(account, {
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

    // Sign with Freighter
    const signedTxXdr = await signTransaction(transaction.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    // Parse signed transaction
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedTxXdr,
      NETWORK_PASSPHRASE
    );

    // Submit to network
    const result = await server.submitTransaction(signedTx as any);

    console.log('Payment successful:', result.hash);
    return result.hash;
  } catch (error: any) {
    console.error('Payment error:', error);
    if (assetCode !== 'XLM') {
      const opCodes: string[] =
        error?.response?.data?.extras?.result_codes?.operations || [];
      // Payer-side no_trust is caught above, so this one is the destination's
      if (opCodes.includes('op_no_trust')) {
        throw new Error(
          `The destination account has no ${assetCode} trustline, so it cannot receive ${assetCode} yet.`
        );
      }
      if (opCodes.includes('op_underfunded')) {
        throw new Error(
          `Insufficient ${assetCode} balance to send ${amount} ${assetCode}.`
        );
      }
    }
    throw new Error(error.message || 'Payment failed');
  }
};

/**
 * Get transaction details
 */
export const getTransaction = async (txHash: string): Promise<any> => {
  try {
    const transaction = await server.transactions().transaction(txHash).call();
    return transaction;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    throw error;
  }
};

/**
 * Check transaction status
 */
export const checkTransactionStatus = async (
  txHash: string
): Promise<'success' | 'failed' | 'pending'> => {
  try {
    const tx = await getTransaction(txHash);
    return tx.successful ? 'success' : 'failed';
  } catch (error) {
    return 'pending';
  }
};

/**
 * Stream payments for an account
 */
export const streamPayments = (
  publicKey: string,
  onPayment: (payment: any) => void
) => {
  const closeHandler = server
    .payments()
    .forAccount(publicKey)
    .cursor('now')
    .stream({
      onmessage: (payment: any) => {
        if (payment.type === 'payment') {
          onPayment(payment);
        }
      },
      onerror: (error: any) => {
        console.error('Payment stream error:', error);
      },
    });

  return closeHandler;
};

/**
 * Format Stellar amount (remove trailing zeros)
 */
export const formatStellarAmount = (amount: string | number): string => {
  return parseFloat(amount.toString()).toString();
};

/**
 * Validate Stellar public key
 */
export const isValidPublicKey = (publicKey: string): boolean => {
  try {
    StellarSdk.Keypair.fromPublicKey(publicKey);
    return true;
  } catch {
    return false;
  }
};

export default {
  server,
  NETWORK_PASSPHRASE,
  checkWalletConnection,
  requestWalletAccess,
  getUserPublicKey,
  loadAccount,
  getAccountBalance,
  checkAssetReadiness,
  sendPayment,
  getTransaction,
  checkTransactionStatus,
  streamPayments,
  formatStellarAmount,
  isValidPublicKey,
};

