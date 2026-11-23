/**
 * Tests for invoice verification (issue #990)
 * Tests destination, asset, expiry checks
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Application } from 'express';
import invoiceController from '../invoice.controller';
import invoiceService from '../../services/invoice.service';
import stellarService from '../../services/stellar.service';
import { VerifyErrorCode } from '../../utils/verify-errors';

// Mock services
vi.mock('../../services/invoice.service');
vi.mock('../../services/stellar.service');

const app: Application = express();
app.use(express.json());
app.post('/api/invoices/:id/verify', invoiceController.verifyPayment.bind(invoiceController));

describe('Invoice Verification (Issue #990)', () => {
  const mockInvoice = {
    id: 'test-invoice-001',
    amount: 100,
    assetCode: 'XLM',
    memo: 'TEST-MEMO-001',
    sellerPublicKey: 'GSELLER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    createdAt: new Date(),
  };

  const mockValidTransaction = {
    transaction: {
      memo: 'TEST-MEMO-001',
    },
    operations: [
      {
        type: 'payment',
        to: 'GSELLER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        from: 'GPAYER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        amount: '100.0000000',
        asset_type: 'native',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject payment to wrong destination', async () => {
    vi.mocked(invoiceService.getInvoiceById).mockResolvedValue(mockInvoice as any);
    vi.mocked(stellarService.getTransaction).mockResolvedValue({
      ...mockValidTransaction,
      operations: [
        {
          ...mockValidTransaction.operations[0],
          to: 'GWRONGDEST1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // Wrong destination
        },
      ],
    } as any);

    const response = await request(app)
      .post('/api/invoices/test-invoice-001/verify')
      .send({ txHash: 'test-tx-hash' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(VerifyErrorCode.DESTINATION_MISMATCH);
  });

  it('should reject native payment when invoice expects XLM credit asset', async () => {
    const invoiceWithXLMCredit = {
      ...mockInvoice,
      assetCode: 'XLM',
      assetIssuer: 'GISSUER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    };

    vi.mocked(invoiceService.getInvoiceById).mockResolvedValue(invoiceWithXLMCredit as any);
    vi.mocked(stellarService.getTransaction).mockResolvedValue(mockValidTransaction as any);

    const response = await request(app)
      .post('/api/invoices/test-invoice-001/verify')
      .send({ txHash: 'test-tx-hash' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(VerifyErrorCode.ASSET_MISMATCH);
  });

  it('should reject XLM credit asset when invoice expects native XLM', async () => {
    vi.mocked(invoiceService.getInvoiceById).mockResolvedValue(mockInvoice as any);
    vi.mocked(stellarService.getTransaction).mockResolvedValue({
      ...mockValidTransaction,
      operations: [
        {
          ...mockValidTransaction.operations[0],
          asset_type: 'credit_alphanum4',
          asset_code: 'XLM',
          asset_issuer: 'GFAKEISSUER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        },
      ],
    } as any);

    const response = await request(app)
      .post('/api/invoices/test-invoice-001/verify')
      .send({ txHash: 'test-tx-hash' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(VerifyErrorCode.ASSET_MISMATCH);
  });

  it('should reject payment with wrong issuer', async () => {
    const invoiceWithUSDC = {
      ...mockInvoice,
      assetCode: 'USDC',
      assetIssuer: 'GUSDC_ISSUER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    };

    vi.mocked(invoiceService.getInvoiceById).mockResolvedValue(invoiceWithUSDC as any);
    vi.mocked(stellarService.getTransaction).mockResolvedValue({
      ...mockValidTransaction,
      operations: [
        {
          ...mockValidTransaction.operations[0],
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: 'GWRONG_ISSUER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        },
      ],
    } as any);

    const response = await request(app)
      .post('/api/invoices/test-invoice-001/verify')
      .send({ txHash: 'test-tx-hash' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(VerifyErrorCode.ASSET_MISMATCH);
  });

  it('should reject payment with missing issuer', async () => {
    const invoiceWithoutIssuer = {
      ...mockInvoice,
      assetCode: 'USDC',
      assetIssuer: undefined, // Missing issuer - should fail closed
    };

    vi.mocked(invoiceService.getInvoiceById).mockResolvedValue(invoiceWithoutIssuer as any);
    vi.mocked(stellarService.getTransaction).mockResolvedValue({
      ...mockValidTransaction,
      operations: [
        {
          ...mockValidTransaction.operations[0],
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: 'GANYISSUER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        },
      ],
    } as any);

    const response = await request(app)
      .post('/api/invoices/test-invoice-001/verify')
      .send({ txHash: 'test-tx-hash' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(VerifyErrorCode.ASSET_MISMATCH);
  });

  it('should reject expired invoice before calling Horizon', async () => {
    const expiredInvoice = {
      ...mockInvoice,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    };

    vi.mocked(invoiceService.getInvoiceById).mockResolvedValue(expiredInvoice as any);

    const response = await request(app)
      .post('/api/invoices/test-invoice-001/verify')
      .send({ txHash: 'test-tx-hash' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(VerifyErrorCode.INVOICE_EXPIRED);
    
    // Horizon should not have been called
    expect(stellarService.getTransaction).not.toHaveBeenCalled();
  });

  it('should reject already paid invoice', async () => {
    const paidInvoice = {
      ...mockInvoice,
      status: 'PAID',
      paymentTxHash: 'previous-tx-hash',
    };

    vi.mocked(invoiceService.getInvoiceById).mockResolvedValue(paidInvoice as any);

    const response = await request(app)
      .post('/api/invoices/test-invoice-001/verify')
      .send({ txHash: 'new-tx-hash' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(VerifyErrorCode.INVOICE_ALREADY_PAID);
    
    // Horizon should not have been called
    expect(stellarService.getTransaction).not.toHaveBeenCalled();
  });

  it('should accept valid native XLM payment', async () => {
    vi.mocked(invoiceService.getInvoiceById).mockResolvedValue(mockInvoice as any);
    vi.mocked(stellarService.getTransaction).mockResolvedValue(mockValidTransaction as any);
    vi.mocked(invoiceService.markAsPaid).mockResolvedValue({
      ...mockInvoice,
      status: 'PAID',
      paymentTxHash: 'test-tx-hash',
    } as any);

    const response = await request(app)
      .post('/api/invoices/test-invoice-001/verify')
      .send({ txHash: 'test-tx-hash' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should accept valid credit asset payment with correct issuer', async () => {
    const invoiceWithUSDC = {
      ...mockInvoice,
      assetCode: 'USDC',
      assetIssuer: 'GUSDC_ISSUER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    };

    vi.mocked(invoiceService.getInvoiceById).mockResolvedValue(invoiceWithUSDC as any);
    vi.mocked(stellarService.getTransaction).mockResolvedValue({
      ...mockValidTransaction,
      operations: [
        {
          ...mockValidTransaction.operations[0],
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: 'GUSDC_ISSUER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        },
      ],
    } as any);
    vi.mocked(invoiceService.markAsPaid).mockResolvedValue({
      ...invoiceWithUSDC,
      status: 'PAID',
    } as any);

    const response = await request(app)
      .post('/api/invoices/test-invoice-001/verify')
      .send({ txHash: 'test-tx-hash' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should ignore whitespace around issuer', async () => {
    const invoiceWithWhitespace = {
      ...mockInvoice,
      assetCode: 'USDC',
      assetIssuer: '  GUSDC_ISSUER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  ',
    };

    vi.mocked(invoiceService.getInvoiceById).mockResolvedValue(invoiceWithWhitespace as any);
    vi.mocked(stellarService.getTransaction).mockResolvedValue({
      ...mockValidTransaction,
      operations: [
        {
          ...mockValidTransaction.operations[0],
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: 'GUSDC_ISSUER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        },
      ],
    } as any);
    vi.mocked(invoiceService.markAsPaid).mockResolvedValue({
      ...invoiceWithWhitespace,
      status: 'PAID',
    } as any);

    const response = await request(app)
      .post('/api/invoices/test-invoice-001/verify')
      .send({ txHash: 'test-tx-hash' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should reject when no payment operation exists', async () => {
    vi.mocked(invoiceService.getInvoiceById).mockResolvedValue(mockInvoice as any);
    vi.mocked(stellarService.getTransaction).mockResolvedValue({
      transaction: { memo: 'TEST-MEMO-001' },
      operations: [
        {
          type: 'create_account', // Not a payment
        },
      ],
    } as any);

    const response = await request(app)
      .post('/api/invoices/test-invoice-001/verify')
      .send({ txHash: 'test-tx-hash' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(VerifyErrorCode.NO_PAYMENT_OPERATION);
  });
});
