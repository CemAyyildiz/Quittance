import * as StellarSdk from '@stellar/stellar-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Unknown network values remain visible to health reporting and must never
// silently select the public network.
export const STELLAR_NETWORK = process.env.STELLAR_NETWORK?.trim().toUpperCase() || 'TESTNET';
export const STELLAR_HORIZON_URL =
  process.env.STELLAR_HORIZON_URL?.trim() ||
  (STELLAR_NETWORK === 'PUBLIC'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org');

export const NETWORK_PASSPHRASE =
  STELLAR_NETWORK === 'PUBLIC' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET;

// Stellar server instance
export const server = new StellarSdk.Horizon.Server(STELLAR_HORIZON_URL);

// Seller account configuration
export const SELLER_PUBLIC_KEY = process.env.SELLER_PUBLIC_KEY || '';
export const SELLER_SECRET_KEY = process.env.SELLER_SECRET_KEY || '';

// Validate configuration
export const validateStellarConfig = () => {
  if (!SELLER_PUBLIC_KEY || !SELLER_SECRET_KEY) {
    throw new Error('Stellar account keys are not configured properly');
  }

  try {
    StellarSdk.Keypair.fromPublicKey(SELLER_PUBLIC_KEY);
  } catch (error) {
    throw new Error('Invalid SELLER_PUBLIC_KEY');
  }

  try {
    StellarSdk.Keypair.fromSecret(SELLER_SECRET_KEY);
  } catch (error) {
    throw new Error('Invalid SELLER_SECRET_KEY');
  }

  console.log(`✅ Stellar configured for ${STELLAR_NETWORK}`);
  console.log(`📍 Horizon URL: ${STELLAR_HORIZON_URL}`);
  console.log(`💰 Seller Account: ${SELLER_PUBLIC_KEY}`);
};

// Helper to get seller keypair
export const getSellerKeypair = () => {
  return StellarSdk.Keypair.fromSecret(SELLER_SECRET_KEY);
};

export default {
  server,
  STELLAR_NETWORK,
  NETWORK_PASSPHRASE,
  SELLER_PUBLIC_KEY,
  validateStellarConfig,
  getSellerKeypair,
};

