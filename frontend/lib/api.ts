import axios from 'axios';
import { mockInvoiceApi, mockStellarApi, mockHealthCheck } from './mock-api';
import { isMockEnabled } from './api-config';

// Mock API is for local development only.
// Production/demo must use the real API (default when unset).
const USE_MOCK_API = isMockEnabled();
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function importInvoiceBackup(sellerPublicKey: string, invoices: unknown) {
  const response = await api.post('/invoices/import', invoices, { params: { sellerPublicKey } });
  return response.data as { success: true; data: { imported: number; skippedIds: string[] } };
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
export const invoiceApi = USE_MOCK_API ? mockInvoiceApi : {
  create: async (data: {
    amount: number;
    lineItems?: Array<{ label: string; quantity: number; unitPrice: number }>;
    assetCode?: string;
    assetIssuer?: string;
    description?: string;
    memo?: string;
    customerName?: string;
    customerEmail?: string;
    expiresInDays?: number;
    expiresAt?: string;
    sellerPublicKey?: string;
    sellerName?: string;
    sellerEmail?: string;
    acknowledgeNoTrustline?: boolean;
  }, options?: { idempotencyKey?: string }) => {
    // A key per submit attempt lets the backend return the original invoice
    // if the same submit reaches it twice.
    const response = await api.post('/invoices', data, {
      headers: options?.idempotencyKey
        ? { 'Idempotency-Key': options.idempotencyKey }
        : undefined,
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  getAll: async (params?: {
    status?: string;
    assetCode?: string;
    createdFrom?: string;
    createdTo?: string;
    limit?: number;
    offset?: number;
    cursor?: string;
    search?: string;
    sellerPublicKey?: string;
  }) => {
    const response = await api.get('/invoices', { params });
    return response.data;
  },

  getPaymentInfo: async (id: string) => {
    const response = await api.get(`/invoices/${id}/payment-info`);
    return response.data;
  },

  // Seller-only append-only status trail (the payer page never calls this).
  getHistory: async (id: string, sellerPublicKey?: string) => {
    const response = await api.get(`/invoices/${id}/history`, {
      params: sellerPublicKey ? { sellerPublicKey } : undefined,
    });
    return response.data;
  },

  // Canonical digest for the receipt the seller writes on chain.
  getProofDigest: async (id: string, sellerPublicKey: string) => {
    const response = await api.get(`/invoices/${id}/proof-digest`, {
      params: { sellerPublicKey },
    });
    return response.data;
  },

  prepareAnchorProof: async (id: string, digest: string, sellerPublicKey: string) => {
    const response = await api.post(`/invoices/${id}/anchor/prepare`, { digest, sellerPublicKey });
    return response.data;
  },

  anchorProof: async (
    id: string,
    payload: { digest: string; txHash: string; sellerPublicKey: string },
  ) => {
    const response = await api.post(`/invoices/${id}/anchor`, payload);
    return response.data;
  },

  cancel: async (id: string, sellerPublicKey: string) => {
    const response = await api.post(`/invoices/${id}/cancel`, {
      sellerPublicKey,
    });
    return response.data;
  },

  duplicate: async (id: string, data: { sellerPublicKey: string; copyCustomerEmail?: boolean }) => {
    const response = await api.post(`/invoices/${id}/duplicate`, data);
    return response.data;
  },

  markUncollectible: async (id: string, sellerPublicKey: string) => {
    const response = await api.post(`/invoices/${id}/uncollectible`, { sellerPublicKey });
    return response.data;
  },

  extendExpiry: async (id: string, data: { sellerPublicKey: string; expiresAt: string }) => {
    const response = await api.post(`/invoices/${id}/extend-expiry`, data);
    return response.data;
  },

  refund: async (id: string, data: { sellerPublicKey: string; refundTxHash: string }) => {
    const response = await api.post(`/invoices/${id}/refund`, data);
    return response.data;
  },

  verify: async (id: string, txHash: string, payerInfo?: { payerName?: string; payerEmail?: string }) => {
    const response = await api.post(`/invoices/${id}/verify`, { 
      txHash,
      ...payerInfo 
    });
    return response.data;
  },

  getStats: async (sellerPublicKey?: string) => {
    const response = await api.get('/invoices/stats', {
      params: sellerPublicKey ? { sellerPublicKey } : undefined,
    });
    return response.data;
  },
};

// Stellar APIs
export const stellarApi = USE_MOCK_API ? mockStellarApi : {
  getAccount: async (publicKey?: string) => {
    const response = await api.get('/stellar/account', {
      params: { publicKey },
    });
    return response.data;
  },

  getPayments: async (publicKey?: string, limit?: number) => {
    const response = await api.get('/stellar/payments', {
      params: { publicKey, limit },
    });
    return response.data;
  },

  getTransaction: async (hash: string) => {
    const response = await api.get(`/stellar/transaction/${hash}`);
    return response.data;
  },

  verifyPayment: async (txHash: string, memo: string, amount: string) => {
    const response = await api.post('/stellar/verify-payment', {
      txHash,
      memo,
      amount,
    });
    return response.data;
  },
};

// Health check
export const healthCheck = USE_MOCK_API ? mockHealthCheck : async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;

