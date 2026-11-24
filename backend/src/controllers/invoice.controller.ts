import { Request, Response } from 'express';
import invoiceService from '../services/invoice.service';
import stellarService from '../services/stellar.service';
import { createInvoiceSchema } from '../utils/validation';
import { generatePaymentQR, generateStellarPaymentQR, buildStellarPaymentUri } from '../utils/qrcode';
import { SELLER_PUBLIC_KEY } from '../config/stellar';
import { toInvoiceDTO } from '../utils/invoice-dto';
import { paymentAssetMatchesInvoice } from '../utils/verify-invoice-payment';
import { assertInvoiceSettleable } from '../utils/invoice-expiry';
import { isDecimalEqual } from '../utils/amount-compare';
import { VerifyErrorCode, VerifyErrorMessages } from '../utils/verify-errors';

class InvoiceController {
  async createInvoice(req: Request, res: Response) {
    try {
      const validatedData = createInvoiceSchema.parse(req.body);
      const invoice = await invoiceService.createInvoice(validatedData);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const paymentUrl = `${frontendUrl}/pay/${invoice.id}`;
      const qrCodeDataUrl = await generatePaymentQR(paymentUrl);
      const stellarQrCode = await generateStellarPaymentQR(
        invoice.sellerPublicKey,
        invoice.amount.toString(),
        invoice.assetCode,
        invoice.memo,
        invoice.assetIssuer
      );
      const stellarPaymentUri = buildStellarPaymentUri(
        invoice.sellerPublicKey,
        invoice.amount.toString(),
        invoice.assetCode,
        invoice.memo,
        invoice.assetIssuer
      );

      res.status(201).json({
        success: true,
        data: {
          invoice: toInvoiceDTO(invoice),
          paymentUrl,
          qrCode: qrCodeDataUrl,
          stellarQrCode,
          stellarPaymentUri,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create invoice',
      });
    }
  }

  async getInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await invoiceService.getInvoiceById(id);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      res.json({
        success: true,
        data: toInvoiceDTO(invoice),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get invoice',
      });
    }
  }

  async getInvoices(req: Request, res: Response) {
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      const invoices = await invoiceService.getInvoicesBySeller(
        SELLER_PUBLIC_KEY,
        status as string | undefined,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: invoices.map((invoice) => toInvoiceDTO(invoice)),
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: invoices.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get invoices',
      });
    }
  }

  async cancelInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await invoiceService.cancelInvoice(id);

      res.json({
        success: true,
        data: toInvoiceDTO(invoice),
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to cancel invoice',
      });
    }
  }

  async verifyPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { txHash, payerName, payerEmail } = req.body;

      if (!txHash) {
        return res.status(400).json({
          success: false,
          code: VerifyErrorCode.TX_HASH_REQUIRED,
          error: VerifyErrorMessages[VerifyErrorCode.TX_HASH_REQUIRED],
        });
      }

      const invoice = await invoiceService.getInvoiceById(id);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          code: VerifyErrorCode.INVOICE_NOT_FOUND,
          error: VerifyErrorMessages[VerifyErrorCode.INVOICE_NOT_FOUND],
        });
      }

      // Check if already paid
      if (invoice.status === 'PAID') {
        return res.status(400).json({
          success: false,
          code: VerifyErrorCode.INVOICE_ALREADY_PAID,
          error: VerifyErrorMessages[VerifyErrorCode.INVOICE_ALREADY_PAID],
        });
      }

      // Check expiry before calling Horizon - fail fast if expired
      const settleable = assertInvoiceSettleable(invoice);
      if (!settleable.ok) {
        return res.status(400).json({
          success: false,
          code: settleable.code,
          error: VerifyErrorMessages[settleable.code],
        });
      }

      // Now fetch transaction from Horizon
      const txDetails = await stellarService.getTransaction(txHash);
      const transaction = txDetails.transaction;
      const paymentOp = txDetails.operations.find((op: any) => op.type === 'payment');

      if (!paymentOp) {
        return res.status(400).json({
          success: false,
          code: VerifyErrorCode.NO_PAYMENT_OPERATION,
          error: VerifyErrorMessages[VerifyErrorCode.NO_PAYMENT_OPERATION],
        });
      }

      // Verify memo
      if (transaction.memo !== invoice.memo) {
        return res.status(400).json({
          success: false,
          code: VerifyErrorCode.MEMO_MISMATCH,
          error: VerifyErrorMessages[VerifyErrorCode.MEMO_MISMATCH],
        });
      }

      // Verify destination matches seller
      if (paymentOp.to !== invoice.sellerPublicKey) {
        return res.status(400).json({
          success: false,
          code: VerifyErrorCode.DESTINATION_MISMATCH,
          error: VerifyErrorMessages[VerifyErrorCode.DESTINATION_MISMATCH],
        });
      }

      // Verify amount
      if (!isDecimalEqual(paymentOp.amount, String(invoice.amount))) {
        return res.status(400).json({
          success: false,
          code: VerifyErrorCode.AMOUNT_MISMATCH,
          error: VerifyErrorMessages[VerifyErrorCode.AMOUNT_MISMATCH],
        });
      }

      // Verify asset using the shared matcher
      const opIsNative = paymentOp.asset_type === 'native';
      const opAsset = opIsNative ? 'XLM' : paymentOp.asset_code;

      if (
        !paymentAssetMatchesInvoice({
          paymentAsset: opAsset,
          invoiceAssetCode: invoice.assetCode,
          paymentAssetIssuer: paymentOp.asset_issuer,
          invoiceAssetIssuer: invoice.assetIssuer,
          paymentIsNative: opIsNative,
        })
      ) {
        return res.status(400).json({
          success: false,
          code: VerifyErrorCode.ASSET_MISMATCH,
          error: VerifyErrorMessages[VerifyErrorCode.ASSET_MISMATCH],
        });
      }

      const updatedInvoice = await invoiceService.markAsPaid(
        invoice.id,
        txHash,
        paymentOp.from,
        { payerName, payerEmail }
      );

      res.json({
        success: true,
        data: toInvoiceDTO(updatedInvoice),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        code: VerifyErrorCode.VERIFY_FAILED,
        error: VerifyErrorMessages[VerifyErrorCode.VERIFY_FAILED],
      });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const stats = await invoiceService.getInvoiceStats(SELLER_PUBLIC_KEY);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get stats',
      });
    }
  }

  async getPaymentInfo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await invoiceService.getInvoiceById(id);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const paymentUrl = `${frontendUrl}/pay/${invoice.id}`;

      const qrCodeDataUrl = await generatePaymentQR(paymentUrl);
      const stellarQrCode = await generateStellarPaymentQR(
        invoice.sellerPublicKey,
        invoice.amount.toString(),
        invoice.assetCode,
        invoice.memo,
        invoice.assetIssuer
      );
      const stellarPaymentUri = buildStellarPaymentUri(
        invoice.sellerPublicKey,
        invoice.amount.toString(),
        invoice.assetCode,
        invoice.memo,
        invoice.assetIssuer
      );

      res.json({
        success: true,
        data: {
          paymentUrl,
          qrCode: qrCodeDataUrl,
          stellarQrCode,
          stellarPaymentUri,
          invoice: toInvoiceDTO(invoice),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get payment info',
      });
    }
  }
}

export default new InvoiceController();

