// Unit tests for the mock API used to drive the UI without a backend.
// Locks the response shapes the dashboard and pay pages depend on:
// English invoice descriptions, and create() returning paymentUrl, memo,
// and a PENDING status.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockInvoiceApi } from '../mock-api';

const ORIGINAL_ORIGIN = window.location.origin;

// Best-effort stub of window.location.origin for environments where it is
// configurable. jsdom ships location.origin as a non-configurable getter,
// so redefinition can fail — in that case we simply assert against the
// live origin, which pins the same contract (origin-rooted pay URL).
function stubOrigin(origin: string) {
  try {
    Object.defineProperty(window.location, 'origin', {
      value: origin,
      writable: true,
      configurable: true,
    });
  } catch {
    // Non-configurable in this jsdom version; fall back to the live origin.
  }
}

describe('mockInvoiceApi', () => {
  afterEach(() => {
    stubOrigin(ORIGINAL_ORIGIN);
    vi.useRealTimers();
  });

  describe('getAll (list)', () => {
    it('returns the seeded invoices with English descriptions', async () => {
      const res = await mockInvoiceApi.getAll();

      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);

      for (const invoice of res.data) {
        // Descriptions are human-readable English strings (non-empty, letters
        // and spaces only) — no placeholders, keys, or error markers.
        expect(typeof invoice.description).toBe('string');
        expect(invoice.description.trim().length).toBeGreaterThan(0);
        expect(invoice.description).toMatch(/^[A-Za-z][A-Za-z ]+$/);
      }

      // Spot-check the exact seeded descriptions.
      const descriptions = res.data.map((inv) => inv.description);
      expect(descriptions).toContain('Web development service');
      expect(descriptions).toContain('Logo design');
      expect(descriptions).toContain('Consulting fee');
      expect(descriptions).toContain('Mobile app development');
    });

    it('filters by status when a status param is given', async () => {
      const res = await mockInvoiceApi.getAll({ status: 'PENDING' });

      expect(res.success).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
      for (const invoice of res.data) {
        expect(invoice.status).toBe('PENDING');
      }
    });

    it('reports pagination totals for the filtered list', async () => {
      const all = await mockInvoiceApi.getAll();
      const pending = await mockInvoiceApi.getAll({ status: 'PENDING' });

      expect(all.pagination.total).toBe(all.data.length);
      expect(pending.pagination.total).toBe(pending.data.length);
      expect(pending.pagination.total).toBeLessThan(all.pagination.total);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      // create() builds paymentUrl from window.location.origin; stub it so
      // the assertion does not depend on the jsdom default origin.
      stubOrigin('https://quittance.test');
    });

    it('returns paymentUrl, memo, and status PENDING', async () => {
      vi.useFakeTimers();
      const resPromise = mockInvoiceApi.create({
        amount: 42,
        assetCode: 'XLM',
        description: 'Wireframe review',
        customerName: 'Ada Lovelace',
        customerEmail: 'ada@example.com',
      });
      // create() awaits a simulated 1s network delay before responding.
      await vi.advanceTimersByTimeAsync(1000);
      const res = await resPromise;

      expect(res.success).toBe(true);
      const { invoice, paymentUrl, stellarPaymentUri } = res.data;

      // Status is locked to PENDING regardless of input.
      expect(invoice.status).toBe('PENDING');

      // A memo is always generated (INV- prefixed, non-empty) and reused in
      // the SEP-0007 URI.
      expect(typeof invoice.memo).toBe('string');
      expect(invoice.memo).toMatch(/^INV-/);
      expect(stellarPaymentUri).toContain(`memo=${invoice.memo}`);

      // paymentUrl is an absolute pay link rooted at window.location.origin
      // (stubbed where supported; asserted against the live origin otherwise).
      expect(paymentUrl).toBe(`${window.location.origin}/pay/${invoice.id}`);
      expect(paymentUrl).toMatch(/^https?:\/\//);

      // Echoed payload and timestamps.
      expect(invoice.amount).toBe(42);
      expect(invoice.assetCode).toBe('XLM');
      expect(invoice.description).toBe('Wireframe review');
      expect(typeof invoice.id).toBe('string');
      expect(invoice.id.length).toBeGreaterThan(0);
      expect(new Date(invoice.createdAt).getTime()).not.toBeNaN();
      expect(new Date(invoice.expiresAt).getTime()).not.toBeNaN();

      // The created invoice becomes visible through getById.
      const fetchedPromise = mockInvoiceApi.getById(invoice.id);
      await vi.advanceTimersByTimeAsync(500); // flush getById's simulated delay
      const fetched = await fetchedPromise;
      expect(fetched.success).toBe(true);
      expect(fetched.data.id).toBe(invoice.id);
      expect(fetched.data.memo).toBe(invoice.memo);
      expect(fetched.data.status).toBe('PENDING');
    });

    it('defaults expiry to 7 days when expiresInDays is omitted', async () => {
      vi.useFakeTimers();
      const resPromise = mockInvoiceApi.create({
        amount: 10,
        assetCode: 'XLM',
        description: 'Quick fix',
        customerName: 'Grace Hopper',
      });
      await vi.advanceTimersByTimeAsync(1000);
      const res = await resPromise;

      const created = Date.parse(res.data.invoice.createdAt);
      const expires = Date.parse(res.data.invoice.expiresAt);
      expect(expires - created).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });
});
