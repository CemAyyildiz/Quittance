import * as StellarSdk from '@stellar/stellar-sdk';
import {
  isConnected,
  getPublicKey,
  signTransaction,
  isAllowed,
  setAllowed,
  getNetworkDetails,
} from '@stellar/freighter-api';
import { hasAssetTrustline } from './assets';

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

const FRIENDBOT_URL = 'https://friendbot.stellar.org';

/** XLM a single-operation payment needs to cover the base network fee. */
export const MIN_XLM_FOR_FEE = Number(StellarSdk.BASE_FEE) / 10_000_000;

export type WalletNetwork = 'TESTNET' | 'PUBLIC' | 'UNKNOWN';

export const getConfiguredNetwork = (): 'TESTNET' | 'PUBLIC' =>
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET')
    .trim()
    .toUpperCase() === 'PUBLIC'
    ? 'PUBLIC'
    : 'TESTNET';

export const isTestnetNetwork = (): boolean => getConfiguredNetwork() === 'TESTNET';

export const hasEnoughXlmForFee = (
  balance: string | number | null | undefined,
): boolean => {
  const amount = typeof balance === 'number' ? balance : Number(balance);
  return Number.isFinite(amount) && amount >= MIN_XLM_FOR_FEE;
};

export const requestFriendbotFunding = async (publicKey: string): Promise<void> => {
  if (!isTestnetNetwork()) {
    throw new Error('Friendbot funding is only available on testnet');
  }
  if (!isValidPublicKey(publicKey)) {
    throw new Error('Invalid Stellar public key');
  }

  const url = new URL(FRIENDBOT_URL);
  url.searchParams.set('addr', publicKey);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Friendbot request failed with status ${response.status}`);
  }
};

export const getWalletNetwork = async (): Promise<WalletNetwork> => {
  try {
    const details = await getNetworkDetails();
    const passphrase = details.networkPassphrase?.trim();
    if (passphrase === StellarSdk.Networks.TESTNET) return 'TESTNET';
    if (passphrase === StellarSdk.Networks.PUBLIC) return 'PUBLIC';

    // Some locked or older wallets do not expose a passphrase. Do not guess:
    // UNKNOWN only blocks actions that explicitly require a confirmed match.
    return 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
};

export const getNetworkMismatch = (
  walletNetwork: WalletNetwork,
  configuredNetwork: 'TESTNET' | 'PUBLIC' = getConfiguredNetwork(),
): boolean =>
  walletNetwork !== 'UNKNOWN' && walletNetwork !== configuredNetwork;

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

export const buildPaymentTransaction = (
  account: StellarSdk.Horizon.AccountResponse,
  destination: string,
  amount: string,
  memo: string,
  assetCode: string = 'XLM',
  assetIssuer?: string,
  maxTime?: number
): StellarSdk.Transaction => {
  if (assetCode !== 'XLM' && !assetIssuer) {
    throw new Error(`An issuer is required for ${assetCode} payments.`);
  }

  const asset =
    assetCode === 'XLM'
      ? StellarSdk.Asset.native()
      : new StellarSdk.Asset(assetCode, assetIssuer);

  const builder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (
    assetCode !== 'XLM' &&
    assetIssuer &&
    !hasAssetTrustline(account.balances as any[], assetCode, assetIssuer)
  ) {
    builder.addOperation(
      StellarSdk.Operation.changeTrust({
        asset,
      })
    );
  }

  builder
    .addOperation(
      StellarSdk.Operation.payment({
        destination,
        asset,
        amount,
      })
    )
    .addMemo(StellarSdk.Memo.text(memo));

  // A payment for an invoice must not outlive the invoice: bound it to the
  // invoice expiry (unix seconds). Otherwise fall back to a short window.
  if (maxTime !== undefined) {
    builder.setTimebounds(0, maxTime);
  } else {
    builder.setTimeout(180);
  }

  return builder.build();
};

export interface SendPaymentOptions {
  /** Account that pays the network fee by wrapping the payment in a fee bump. */
  feeSource?: string;
  /** Invoice expiry in unix seconds; bounds the payment transaction. */
  maxTime?: number;
}

/**
 * Wrap an already-built inner payment transaction in a fee-bump transaction.
 * The fee source only pays the network fee; the inner transaction keeps its
 * own source account, operations, and memo.
 */
export const buildFeeBumpPaymentTransaction = (
  innerTransaction: StellarSdk.Transaction,
  feeSource: string
): StellarSdk.FeeBumpTransaction => {
  return StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
    feeSource,
    StellarSdk.BASE_FEE,
    innerTransaction,
    NETWORK_PASSPHRASE
  );
};

/**
 * Send payment with memo. When `options.feeSource` is set, the payer signs the
 * inner payment and the fee source signs the wrapping fee bump.
 *
 * The sixth argument accepts either the invoice expiry in unix seconds (the
 * original calling convention) or an options object carrying both the expiry
 * and an optional fee source.
 */
export const sendPayment = async (
  destination: string,
  amount: string,
  memo: string,
  assetCode: string = 'XLM',
  assetIssuer?: string,
  maxTimeOrOptions?: number | SendPaymentOptions,
  options?: SendPaymentOptions
): Promise<string> => {
  const paymentOptions: SendPaymentOptions =
    typeof maxTimeOrOptions === 'number'
      ? { ...options, maxTime: maxTimeOrOptions }
      : maxTimeOrOptions ?? options ?? {};
  const maxTime = paymentOptions.maxTime;
  try {
    const feeSourceOption = paymentOptions;

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

    // Existing trustlines with insufficient balances should still fail with
    // clear guidance. Missing trustlines are opened in the transaction below.
    if (assetCode !== 'XLM' && assetIssuer) {
      const readiness = getAssetReadiness(
        account.balances as any[],
        assetCode,
        assetIssuer,
        amount
      );
      if (readiness === 'insufficient-balance') {
        throw new Error(
          `Insufficient ${assetCode} balance to send ${amount} ${assetCode}. Fund your wallet with testnet ${assetCode}, then try again.`
        );
      }
    }

    const transaction = buildPaymentTransaction(
      account,
      destination,
      amount,
      memo,
      assetCode,
      assetIssuer,
      maxTime
    );

    // The fee source pays the fee but is not the payer: sign the inner
    // payment with the payer first, then wrap and sign with the fee source.
    const feeSource = feeSourceOption?.feeSource?.trim();
    const signedTxXdr = await signTransaction(transaction.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
      ...(feeSource ? { accountToSign: userPublicKey } : {}),
    });

    let submitTx: StellarSdk.Transaction | StellarSdk.FeeBumpTransaction =
      StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);

    if (feeSource) {
      if (!(submitTx instanceof StellarSdk.Transaction)) {
        throw new Error('A fee bump can only wrap a regular payment transaction.');
      }

      const feeBumpTx = buildFeeBumpPaymentTransaction(submitTx, feeSource);
      const signedFeeBumpXdr = await signTransaction(feeBumpTx.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
        accountToSign: feeSource,
      });

      submitTx = StellarSdk.TransactionBuilder.fromXDR(
        signedFeeBumpXdr,
        NETWORK_PASSPHRASE
      );
    }

    // Submit to network
    const result = await server.submitTransaction(submitTx as any);

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
  isTestnetNetwork,
  hasEnoughXlmForFee,
  requestFriendbotFunding,
  buildPaymentTransaction,
  buildFeeBumpPaymentTransaction,
  sendPayment,
  getTransaction,
  checkTransactionStatus,
  streamPayments,
  formatStellarAmount,
  isValidPublicKey,
};
