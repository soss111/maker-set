-- Migration to add invoice and payment tracking fields to orders table
-- Run this migration to support the new invoice workflow

-- Add new columns to orders table
ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'credit_card';
ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN invoice_required INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN set_type TEXT DEFAULT 'provider';

-- Update existing orders to have default values
UPDATE orders SET payment_method = 'credit_card' WHERE payment_method IS NULL;
UPDATE orders SET payment_status = 'pending' WHERE payment_status IS NULL;
UPDATE orders SET invoice_required = 0 WHERE invoice_required IS NULL;
UPDATE orders SET set_type = 'provider' WHERE set_type IS NULL;

-- Add index for better performance on payment status queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_set_type ON orders(set_type);
CREATE INDEX IF NOT EXISTS idx_orders_invoice_required ON orders(invoice_required);
