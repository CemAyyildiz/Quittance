// Postgres storage - Database-backed persistence
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';

interface Invoice {
  id: string;
  sellerPublicKey: string;
  amount: number;
  assetCode: string;
  assetIssuer?: string;
  memo: string;
  description?: string;
  lineItems?: unknown[];
  customerName?: string;
  customerEmail?: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  paymentTxHash?: string;
  payerPublicKey?: string;
  ledger?: number;
  createdAt: Date;
  paidAt?: Date;
  expiresAt: Date;
  originalExpiresAt: Date;
  expiryExtended: boolean;
}

class PostgresStorage {
  private schemaReady: Promise<void> | null = null;

  private ensureSchema(): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = pool.query(`
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ledger BIGINT;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_expires_at TIMESTAMP;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS expiry_extended BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS line_items JSONB;
        CREATE INDEX IF NOT EXISTS idx_invoices_payment_tx_hash ON invoices(payment_tx_hash);
      `).then(() => undefined);
    }
    return this.schemaReady;
  }

  // Create invoice
  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    await this.ensureSchema();
    const id = data.id || uuidv4();
    const createdAt = new Date();
    const expiresAt = data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const originalExpiresAt = data.originalExpiresAt || expiresAt;

    const result = await pool.query(
      `INSERT INTO invoices (
        id, seller_public_key, amount, asset_code, asset_issuer, 
        memo, description, line_items, customer_name, customer_email,
        status, created_at, expires_at, original_expires_at, expiry_extended
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id,
        data.sellerPublicKey,
        data.amount,
        data.assetCode || 'XLM',
        data.assetIssuer || null,
        data.memo,
        data.description || null,
        data.lineItems ? JSON.stringify(data.lineItems) : null,
        data.customerName || null,
        data.customerEmail || null,
        'PENDING',
        createdAt,
        expiresAt,
        originalExpiresAt,
        data.expiryExtended ?? false,
      ]
    );

    console.log('✅ Invoice created in Postgres:', id);
    return this.mapRow(result.rows[0]);
  }

  // Get invoice by ID
  async getInvoiceById(id: string): Promise<Invoice | undefined> {
    await this.ensureSchema();
    const result = await pool.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : undefined;
  }

  // Get invoice by memo
  async getInvoiceByMemo(memo: string): Promise<Invoice | undefined> {
    await this.ensureSchema();
    const result = await pool.query(
      'SELECT * FROM invoices WHERE memo = $1',
      [memo]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : undefined;
  }

  async getInvoiceByTxHash(txHash: string): Promise<Invoice | undefined> {
    await this.ensureSchema();
    const result = await pool.query(
      'SELECT * FROM invoices WHERE payment_tx_hash = $1',
      [txHash]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : undefined;
  }

  // Update invoice
  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    await this.ensureSchema();
    const invoice = await this.getInvoiceById(id);
    if (!invoice) return undefined;

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.paymentTxHash !== undefined) {
      fields.push(`payment_tx_hash = $${paramIndex++}`);
      values.push(updates.paymentTxHash);
    }
    if (updates.payerPublicKey !== undefined) {
      fields.push(`payer_public_key = $${paramIndex++}`);
      values.push(updates.payerPublicKey);
    }
    if (updates.paidAt !== undefined) {
      fields.push(`paid_at = $${paramIndex++}`);
      values.push(updates.paidAt);
    }
    if (updates.ledger !== undefined) {
      fields.push(`ledger = $${paramIndex++}`);
      values.push(updates.ledger);
    }
    if (updates.expiresAt !== undefined) {
      fields.push(`expires_at = $${paramIndex++}`);
      values.push(updates.expiresAt);
    }
    if (updates.originalExpiresAt !== undefined) {
      fields.push(`original_expires_at = $${paramIndex++}`);
      values.push(updates.originalExpiresAt);
    }
    if (updates.expiryExtended !== undefined) {
      fields.push(`expiry_extended = $${paramIndex++}`);
      values.push(updates.expiryExtended);
    }
    if (updates.lineItems !== undefined) {
      fields.push(`line_items = $${paramIndex++}`);
      values.push(JSON.stringify(updates.lineItems));
    }

    if (fields.length === 0) return invoice;

    values.push(id);
    const result = await pool.query(
      `UPDATE invoices SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    console.log('✅ Invoice updated in Postgres:', id);
    return this.mapRow(result.rows[0]);
  }

  // Mark as paid
  async markAsPaid(
    id: string,
    txHash: string,
    payerPublicKey: string,
    meta?: { ledger?: number; paidAt?: Date }
  ): Promise<Invoice | undefined> {
    return this.updateInvoice(id, {
      status: 'PAID',
      paymentTxHash: txHash,
      payerPublicKey,
      paidAt: meta?.paidAt ?? new Date(),
      ledger: meta?.ledger,
    });
  }

  // Get all invoices
  async getAllInvoices(filter?: { status?: string }): Promise<Invoice[]> {
    await this.ensureSchema();
    let query = 'SELECT * FROM invoices';
    const values: any[] = [];

    if (filter?.status) {
      query += ' WHERE status = $1';
      values.push(filter.status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    return result.rows.map(row => this.mapRow(row));
  }

  // Get stats
  async getStats(sellerPublicKey: string): Promise<any> {
    await this.ensureSchema();
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_invoices,
        COUNT(*) FILTER (WHERE status = 'PAID') as paid_invoices,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_invoices,
        COUNT(*) FILTER (WHERE status = 'EXPIRED') as expired_invoices,
        COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0) as total_revenue,
        COALESCE(MAX(asset_code), 'XLM') as asset_code
      FROM invoices
      WHERE seller_public_key = $1`,
      [sellerPublicKey]
    );

    const row = result.rows[0];
    return {
      total_invoices: parseInt(row.total_invoices, 10),
      paid_invoices: parseInt(row.paid_invoices, 10),
      pending_invoices: parseInt(row.pending_invoices, 10),
      expired_invoices: parseInt(row.expired_invoices, 10),
      total_revenue: parseFloat(row.total_revenue),
      asset_code: row.asset_code,
    };
  }

  // Mark expired invoices
  async markExpiredInvoices(): Promise<number> {
    await this.ensureSchema();
    const result = await pool.query(
      `UPDATE invoices 
       SET status = 'EXPIRED' 
       WHERE status = 'PENDING' AND expires_at < NOW()
       RETURNING id`
    );

    const count = result.rowCount || 0;
    if (count > 0) {
      console.log(`⏰ Marked ${count} invoices as expired in Postgres`);
    }

    return count;
  }

  // Map database row to Invoice interface
  private mapRow(row: any): Invoice {
    return {
      id: row.id,
      sellerPublicKey: row.seller_public_key,
      amount: parseFloat(row.amount),
      assetCode: row.asset_code,
      assetIssuer: row.asset_issuer || undefined,
      memo: row.memo,
      description: row.description || undefined,
      lineItems: row.line_items || undefined,
      customerName: row.customer_name || undefined,
      customerEmail: row.customer_email || undefined,
      status: row.status,
      paymentTxHash: row.payment_tx_hash || undefined,
      payerPublicKey: row.payer_public_key || undefined,
      ledger: row.ledger === null || row.ledger === undefined ? undefined : Number(row.ledger),
      createdAt: new Date(row.created_at),
      paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
      expiresAt: new Date(row.expires_at),
      originalExpiresAt: row.original_expires_at ? new Date(row.original_expires_at) : new Date(row.expires_at),
      expiryExtended: Boolean(row.expiry_extended),
    };
  }
}

export default new PostgresStorage();
