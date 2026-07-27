import axios from 'axios';
import { mockInvoiceApi, mockStellarApi, mockHealthCheck } from './mock-api';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    assetCode?: string;
    assetIssuer?: string;
    description?: string;
    customerName?: string;
    customerEmail?: string;
    expiresInDays?: number;
    sellerPublicKey?: string;
    sellerName?: string;
    sellerEmail?: string;
  }) => {
    const response = await api.post('/invoices', data);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  getAll: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
    sellerPublicKey?: string;
  }) => {
    const response = await api.get('/invoices', { params });
    return response.data;
  },

  getPaymentInfo: async (id: string) => {
    const response = await api.get(`/invoices/${id}/payment-info`);
    return response.data;
  },

  cancel: async (id: string) => {
    const response = await api.post(`/invoices/${id}/cancel`);
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

