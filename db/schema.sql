-- Quittance Database Schema
-- PostgreSQL Database

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  stellar_public_key VARCHAR(56) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  seller_public_key VARCHAR(56) NOT NULL,
  seller_muxed_address VARCHAR(69),
  seller_name VARCHAR(255),
  seller_email VARCHAR(255),
  amount DECIMAL(20, 7) NOT NULL,
  asset_code VARCHAR(12) DEFAULT 'XLM',
  asset_issuer VARCHAR(56),
  memo TEXT UNIQUE NOT NULL,
  description TEXT,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'UNCOLLECTIBLE')),
  payment_tx_hash VARCHAR(64),
  payer_public_key VARCHAR(56),
  payer_name VARCHAR(255),
  payer_email VARCHAR(255),
  ledger BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
  original_expires_at TIMESTAMP,
  expiry_extended BOOLEAN NOT NULL DEFAULT false,
  anchoring_tx_hash VARCHAR(64),
  metadata JSONB
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_muxed_address VARCHAR(69);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  from_address VARCHAR(56) NOT NULL,
  to_address VARCHAR(56) NOT NULL,
  amount DECIMAL(20, 7) NOT NULL,
  asset_code VARCHAR(12) DEFAULT 'XLM',
  asset_issuer VARCHAR(56),
  tx_hash VARCHAR(64) UNIQUE NOT NULL,
  memo TEXT,
  ledger BIGINT,
  processed_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- Payment Events Log
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_seller ON invoices(seller_public_key);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_memo ON invoices(memo);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id ON transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_users_stellar_public_key ON users(stellar_public_key);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample view for invoice statistics
CREATE OR REPLACE VIEW invoice_stats AS
SELECT 
  seller_public_key,
  COUNT(*) as total_invoices,
  SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as paid_invoices,
  SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_invoices,
  SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END) as total_revenue,
  asset_code
FROM invoices
GROUP BY seller_public_key, asset_code;

