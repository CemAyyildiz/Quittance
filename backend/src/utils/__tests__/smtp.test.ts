/**
 * Tests for SMTP invoice delivery (issue #997)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getSmtpConfig,
  isSmtpConfigured,
  sendEmail,
  generateInvoiceEmail,
} from '../smtp';

describe('SMTP Invoice Delivery (Issue #997)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getSmtpConfig', () => {
    it('should return null when SMTP is not configured', () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      delete process.env.SMTP_FROM;

      expect(getSmtpConfig()).toBeNull();
    });

    it('should return null when only some SMTP vars are set', () => {
      process.env.SMTP_HOST = 'localhost';
      process.env.SMTP_PORT = '1025';
      // Missing other vars

      expect(getSmtpConfig()).toBeNull();
    });

    it('should return config when all SMTP vars are set', () => {
      process.env.SMTP_HOST = 'localhost';
      process.env.SMTP_PORT = '1025';
      process.env.SMTP_USER = 'test';
      process.env.SMTP_PASS = 'test';
      process.env.SMTP_FROM = 'noreply@quittance.test';

      const config = getSmtpConfig();

      expect(config).not.toBeNull();
      expect(config?.host).toBe('localhost');
      expect(config?.port).toBe(1025);
      expect(config?.user).toBe('test');
      expect(config?.pass).toBe('test');
      expect(config?.from).toBe('noreply@quittance.test');
    });

    it('should parse SMTP_SECURE correctly', () => {
      process.env.SMTP_HOST = 'smtp.gmail.com';
      process.env.SMTP_PORT = '465';
      process.env.SMTP_USER = 'test';
      process.env.SMTP_PASS = 'test';
      process.env.SMTP_FROM = 'noreply@quittance.test';
      process.env.SMTP_SECURE = 'true';

      const config = getSmtpConfig();

      expect(config?.secure).toBe(true);
    });

    it('should default SMTP_SECURE to false', () => {
      process.env.SMTP_HOST = 'localhost';
      process.env.SMTP_PORT = '1025';
      process.env.SMTP_USER = 'test';
      process.env.SMTP_PASS = 'test';
      process.env.SMTP_FROM = 'noreply@quittance.test';
      delete process.env.SMTP_SECURE;

      const config = getSmtpConfig();

      expect(config?.secure).toBe(false);
    });
  });

  describe('isSmtpConfigured', () => {
    it('should return false when SMTP is not configured', () => {
      delete process.env.SMTP_HOST;

      expect(isSmtpConfigured()).toBe(false);
    });

    it('should return true when SMTP is configured', () => {
      process.env.SMTP_HOST = 'localhost';
      process.env.SMTP_PORT = '1025';
      process.env.SMTP_USER = 'test';
      process.env.SMTP_PASS = 'test';
      process.env.SMTP_FROM = 'noreply@quittance.test';

      expect(isSmtpConfigured()).toBe(true);
    });
  });

  describe('generateInvoiceEmail', () => {
    it('should generate email with all required fields', () => {
      const email = generateInvoiceEmail(
        'test-invoice-123',
        100.50,
        'XLM',
        'TEST-MEMO-001',
        'https://quittance.test/pay/test-invoice-123',
        'John Doe'
      );

      expect(email.subject).toContain('TEST-INV');
      expect(email.subject).toContain('100.5');
      expect(email.subject).toContain('XLM');
      
      expect(email.text).toContain('Hello John Doe');
      expect(email.text).toContain('100.5');
      expect(email.text).toContain('XLM');
      expect(email.text).toContain('TEST-MEMO-001');
      expect(email.text).toContain('https://quittance.test/pay/test-invoice-123');
      
      expect(email.html).toContain('Hello John Doe');
      expect(email.html).toContain('100.5');
      expect(email.html).toContain('XLM');
      expect(email.html).toContain('TEST-MEMO-001');
      expect(email.html).toContain('https://quittance.test/pay/test-invoice-123');
    });

    it('should use generic greeting when no customer name', () => {
      const email = generateInvoiceEmail(
        'test-invoice-123',
        100.50,
        'XLM',
        'TEST-MEMO-001',
        'https://quittance.test/pay/test-invoice-123'
      );

      expect(email.text).toContain('Hello,');
      expect(email.text).not.toContain('Hello undefined');
      
      expect(email.html).toContain('Hello,');
      expect(email.html).not.toContain('Hello undefined');
    });

    it('should include payment URL in both text and HTML', () => {
      const paymentUrl = 'https://quittance.test/pay/test-invoice-123';
      const email = generateInvoiceEmail(
        'test-invoice-123',
        100.50,
        'XLM',
        'TEST-MEMO-001',
        paymentUrl
      );

      expect(email.text).toContain(paymentUrl);
      expect(email.html).toContain(paymentUrl);
    });

    it('should include amount and asset in subject', () => {
      const email = generateInvoiceEmail(
        'test-invoice-123',
        250.75,
        'USDC',
        'TEST-MEMO-001',
        'https://quittance.test/pay/test-invoice-123'
      );

      expect(email.subject).toContain('250.75');
      expect(email.subject).toContain('USDC');
    });

    it('should include memo in email body', () => {
      const memo = 'INVOICE-2024-001';
      const email = generateInvoiceEmail(
        'test-invoice-123',
        100,
        'XLM',
        memo,
        'https://quittance.test/pay/test-invoice-123'
      );

      expect(email.text).toContain(memo);
      expect(email.html).toContain(memo);
    });
  });

  describe('sendEmail', () => {
    it('should throw error when SMTP is not configured', async () => {
      delete process.env.SMTP_HOST;

      await expect(
        sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test email',
        })
      ).rejects.toThrow('SMTP is not configured');
    });

    // Note: Full integration test with actual SMTP sending would require
    // a test SMTP server (like MailHog or smtp-server). This would be
    // added in an integration test suite.
  });
});
