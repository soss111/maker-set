-- Migration to add monthly reports and notifications tables
-- Run this migration to support automated reporting and notifications

-- Create monthly_reports table
CREATE TABLE IF NOT EXISTS monthly_reports (
  report_id INTEGER PRIMARY KEY AUTOINCREMENT,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_providers INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_platform_fees DECIMAL(10,2) DEFAULT 0,
  total_provider_payments DECIMAL(10,2) DEFAULT 0,
  report_data TEXT, -- JSON data of the full report
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  generated_by INTEGER REFERENCES users(user_id),
  status VARCHAR(20) DEFAULT 'generated' -- generated, processed, archived
);

-- Create system_notifications table
CREATE TABLE IF NOT EXISTS system_notifications (
  notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
  type VARCHAR(50) NOT NULL, -- monthly_report, payment_processed, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data TEXT, -- JSON data for additional context
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_for INTEGER REFERENCES users(user_id), -- NULL for all admins
  priority VARCHAR(20) DEFAULT 'normal' -- low, normal, high, urgent
);

-- Create provider_invoices table
CREATE TABLE IF NOT EXISTS provider_invoices (
  invoice_id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER REFERENCES monthly_reports(report_id),
  provider_id INTEGER REFERENCES users(user_id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_revenue DECIMAL(10,2) NOT NULL,
  provider_markup_percentage DECIMAL(5,2) NOT NULL,
  provider_payment DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  invoice_pdf_path VARCHAR(500), -- Path to generated PDF
  status VARCHAR(20) DEFAULT 'generated', -- generated, sent, paid
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_monthly_reports_month_year ON monthly_reports(month, year);
CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(type);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_for ON system_notifications(created_for);
CREATE INDEX IF NOT EXISTS idx_system_notifications_is_read ON system_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_provider_invoices_provider ON provider_invoices(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_invoices_report ON provider_invoices(report_id);
