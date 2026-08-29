// Mock API - for testing the UI without a backend

import { buildStellarPaymentUri } from '@/lib/stellar-payment-uri';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type MockInvoice = {
  id: string;
  amount: number;
  assetCode: string;
  assetIssuer?: string;
  description: string;
  customerName: string;
  customerEmail?: string;
  status: string;
  memo: string;
  sellerPublicKey: string;
  createdAt: string;
  paidAt?: string;
  expiresAt: string;
  paymentTxHash?: string;
  payerPublicKey?: string;
};

// Mock invoice data
const mockInvoices: MockInvoice[] = [
  {
    id: '1',
    amount: 100.50,
    assetCode: 'XLM',
    assetIssuer: undefined,
    description: 'Web development service',
    customerName: 'John Doe',
    customerEmail: 'ahmet@example.com',
    status: 'PAID',
    memo: 'INV-DEMO-001',
    sellerPublicKey: 'GABC123EXAMPLE456',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    paymentTxHash: 'abc123def456ghi789',
    payerPublicKey: 'GXYZ789EXAMPLE123',
  },
  {
    id: '2',
    amount: 250.00,
    assetCode: 'XLM',
    assetIssuer: undefined,
    description: 'Logo design',
    customerName: 'Jane Smith',
    status: 'PENDING',
    memo: 'INV-DEMO-002',
    sellerPublicKey: 'GABC123EXAMPLE456',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    amount: 75.25,
    assetCode: 'XLM',
    assetIssuer: undefined,
    description: 'Consulting fee',
    customerName: 'David Miller',
    status: 'PENDING',
    memo: 'INV-DEMO-003',
    sellerPublicKey: 'GABC123EXAMPLE456',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 6.8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    amount: 500.00,
    assetCode: 'USDC',
    assetIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    description: 'Mobile app development',
    customerName: 'Sarah Johnson',
    status: 'EXPIRED',
    memo: 'INV-DEMO-004',
    sellerPublicKey: 'GABC123EXAMPLE456',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const mockInvoiceApi = {
  create: async (data: any) => {
    await delay(1000); // Simulate network delay
    
    const newInvoice = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      status: 'PENDING',
      memo: `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      sellerPublicKey: 'GABC123EXAMPLE456789',
      assetIssuer: data.assetIssuer,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (data.expiresInDays || 7) * 24 * 60 * 60 * 1000).toISOString(),
    };

    mockInvoices.unshift(newInvoice);

    const paymentUrl = `${window.location.origin}/pay/${newInvoice.id}`;
    const qrCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const stellarPaymentUri = buildStellarPaymentUri(
      newInvoice.sellerPublicKey,
      newInvoice.amount.toString(),
      newInvoice.assetCode,
      newInvoice.memo,
      newInvoice.assetIssuer
    );

    return {
      success: true,
      data: {
        invoice: newInvoice,
        paymentUrl,
        qrCode,
        stellarQrCode: qrCode,
        stellarPaymentUri,
      },
    };
  },

  getById: async (id: string) => {
    await delay(500);
    const invoice = mockInvoices.find(inv => inv.id === id);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return {
      success: true,
      data: invoice,
    };
  },

  getAll: async (params?: any) => {
    await delay(700);
    let filtered = [...mockInvoices];

    if (params?.status && params.status !== 'ALL') {
      filtered = filtered.filter(inv => inv.status === params.status);
    }

    return {
      success: true,
      data: filtered,
      pagination: {
        limit: params?.limit || 50,
        offset: params?.offset || 0,
        total: filtered.length,
      },
    };
  },

  getPaymentInfo: async (id: string) => {
    await delay(500);
    const invoice = mockInvoices.find(inv => inv.id === id);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const paymentUrl = `${window.location.origin}/pay/${invoice.id}`;
    const qrCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const stellarPaymentUri = buildStellarPaymentUri(
      invoice.sellerPublicKey,
      invoice.amount.toString(),
      invoice.assetCode,
      invoice.memo,
      (invoice as any).assetIssuer
    );

    return {
      success: true,
      data: {
        paymentUrl,
        qrCode,
        stellarQrCode: qrCode,
        stellarPaymentUri,
        invoice,
      },
    };
  },

  cancel: async (id: string) => {
    await delay(500);
    const invoice = mockInvoices.find(inv => inv.id === id);
    
    if (invoice) {
      invoice.status = 'CANCELLED';
    }

    return {
      success: true,
      data: invoice,
    };
  },

  verify: async (id: string, txHash: string) => {
    await delay(1000);
    const invoice = mockInvoices.find(inv => inv.id === id);
    
    if (invoice) {
      invoice.status = 'PAID';
      invoice.paymentTxHash = txHash;
      invoice.paidAt = new Date().toISOString();
    }

    return {
      success: true,
      data: invoice,
    };
  },

  getStats: async () => {
    await delay(500);
    
    const stats = {
      total_invoices: mockInvoices.length,
      paid_invoices: mockInvoices.filter(inv => inv.status === 'PAID').length,
      pending_invoices: mockInvoices.filter(inv => inv.status === 'PENDING').length,
      expired_invoices: mockInvoices.filter(inv => inv.status === 'EXPIRED').length,
      total_revenue: mockInvoices
        .filter(inv => inv.status === 'PAID')
        .reduce((sum, inv) => sum + inv.amount, 0),
      asset_code: 'XLM',
    };

    return {
      success: true,
      data: [stats],
    };
  },
};

export const mockStellarApi = {
  getAccount: async (publicKey?: string) => {
    await delay(500);
    return {
      success: true,
      data: {
        publicKey: publicKey || 'GABC123EXAMPLE456',
        balances: [
          { assetCode: 'XLM', balance: '1234.5678900' },
          { assetCode: 'USDC', balance: '500.00' },
        ],
        sequence: '123456789',
        subentryCount: 5,
      },
    };
  },

  getPayments: async (publicKey?: string, limit?: number) => {
    await delay(500);
    return {
      success: true,
      data: [],
    };
  },

  getTransaction: async (hash: string) => {
    await delay(500);
    return {
      success: true,
      data: {
        transaction: {
          hash,
          memo: 'INV-DEMO-001',
          successful: true,
        },
        operations: [],
      },
    };
  },

  verifyPayment: async (txHash: string, memo: string, amount: string) => {
    await delay(500);
    return {
      success: true,
      data: {
        isValid: true,
        txHash,
        memo,
        amount,
      },
    };
  },
};

export const mockHealthCheck = async () => {
  await delay(200);
  return {
    status: 'ok (MOCK MODE)',
    timestamp: new Date().toISOString(),
    service: 'Quittance API (Mock)',
  };
};
