-- Database Migration Script
-- Safely migrates existing database to unified schema
-- This script preserves existing data while fixing schema issues

-- Backup existing data
CREATE TABLE IF NOT EXISTS backup_sets AS SELECT * FROM sets;
CREATE TABLE IF NOT EXISTS backup_users AS SELECT * FROM users;
CREATE TABLE IF NOT EXISTS backup_orders AS SELECT * FROM orders;
CREATE TABLE IF NOT EXISTS backup_order_items AS SELECT * FROM order_items;
CREATE TABLE IF NOT EXISTS backup_parts AS SELECT * FROM parts;
CREATE TABLE IF NOT EXISTS backup_provider_sets AS SELECT * FROM provider_sets;

-- Add missing columns to existing tables
-- Add missing columns to sets table
ALTER TABLE sets ADD COLUMN name VARCHAR(255);
ALTER TABLE sets ADD COLUMN description TEXT;
ALTER TABLE sets ADD COLUMN base_price DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE sets ADD COLUMN video_url TEXT;
ALTER TABLE sets ADD COLUMN learning_outcomes TEXT;

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN provider_markup_percentage DECIMAL(5,2) DEFAULT 80.00;

-- Add missing columns to parts table
ALTER TABLE parts ADD COLUMN name VARCHAR(255);
ALTER TABLE parts ADD COLUMN description TEXT;
ALTER TABLE parts ADD COLUMN active BOOLEAN DEFAULT 1;

-- Update existing data with default values where NULL
UPDATE sets SET name = 'Unnamed Set' WHERE name IS NULL;
UPDATE sets SET description = 'No description available' WHERE description IS NULL;
UPDATE sets SET base_price = 0.00 WHERE base_price IS NULL;

UPDATE parts SET name = 'Unnamed Part' WHERE name IS NULL;
UPDATE parts SET description = 'No description available' WHERE description IS NULL;
UPDATE parts SET active = 1 WHERE active IS NULL;

UPDATE users SET provider_markup_percentage = 80.00 WHERE provider_markup_percentage IS NULL;

-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create media_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS media_files (
    media_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(user_id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system settings if they don't exist
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('platform_fee_percentage', '20', 'number', 'Platform fee percentage (0-100)', 1),
('handling_fee_amount', '15', 'number', 'Default handling fee amount in EUR', 1),
('handling_fee_description', 'Handling, Packaging & Transport', 'string', 'Description for handling fee', 1),
('default_currency', 'EUR', 'string', 'Default currency for the system', 1),
('max_file_size_mb', '10', 'number', 'Maximum file upload size in MB', 0),
('supported_image_types', 'jpg,jpeg,png,gif,webp', 'string', 'Supported image file types', 0),
('supported_document_types', 'pdf,doc,docx,txt', 'string', 'Supported document file types', 0);

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_sets_active ON sets(active);
CREATE INDEX IF NOT EXISTS idx_sets_category ON sets(category);
CREATE INDEX IF NOT EXISTS idx_sets_difficulty ON sets(difficulty_level);

CREATE INDEX IF NOT EXISTS idx_provider_sets_provider ON provider_sets(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_sets_set ON provider_sets(set_id);
CREATE INDEX IF NOT EXISTS idx_provider_sets_active ON provider_sets(is_active);

CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
CREATE INDEX IF NOT EXISTS idx_parts_stock ON parts(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_parts_active ON parts(active);

CREATE INDEX IF NOT EXISTS idx_set_parts_set ON set_parts(set_id);
CREATE INDEX IF NOT EXISTS idx_set_parts_part ON set_parts(part_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_set ON order_items(set_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_order ON payment_history(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_date ON payment_history(changed_at);

CREATE INDEX IF NOT EXISTS idx_media_files_set ON media_files(set_id);
CREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(file_type);

-- Clean up backup tables after successful migration
-- DROP TABLE IF EXISTS backup_sets;
-- DROP TABLE IF EXISTS backup_users;
-- DROP TABLE IF EXISTS backup_orders;
-- DROP TABLE IF EXISTS backup_order_items;
-- DROP TABLE IF EXISTS backup_parts;
-- DROP TABLE IF EXISTS backup_provider_sets;

