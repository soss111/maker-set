-- Create system_settings table for storing application configuration
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    category VARCHAR(50) DEFAULT 'general', -- system, database, api, notifications, etc.
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create backup_history table for tracking backups
CREATE TABLE IF NOT EXISTS backup_history (
    id SERIAL PRIMARY KEY,
    backup_name VARCHAR(200) NOT NULL,
    backup_type VARCHAR(50) NOT NULL, -- full, incremental, manual, automated
    file_path VARCHAR(500),
    file_size BIGINT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);

-- Create maintenance_logs table for tracking maintenance operations
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(100) NOT NULL, -- clear_cache, optimize_db, system_check, etc.
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    details TEXT,
    executed_by INTEGER REFERENCES users(user_id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    error_message TEXT
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES
('system_name', 'MakerSet Solutions', 'string', 'system', 'Application name'),
('system_version', '1.0.0', 'string', 'system', 'Application version'),
('environment', 'production', 'string', 'system', 'Deployment environment'),
('debug_mode', 'false', 'boolean', 'system', 'Enable debug logging'),
('maintenance_mode', 'false', 'boolean', 'system', 'Enable maintenance mode'),
('db_host', 'localhost', 'string', 'database', 'Database host'),
('db_port', '5433', 'number', 'database', 'Database port'),
('db_name', 'makerset_db', 'string', 'database', 'Database name'),
('db_ssl', 'false', 'boolean', 'database', 'Enable SSL connection'),
('db_pool_size', '10', 'number', 'database', 'Connection pool size'),
('db_timeout', '5000', 'number', 'database', 'Connection timeout in ms'),
('api_port', '5001', 'number', 'api', 'API server port'),
('api_timeout', '30000', 'number', 'api', 'Request timeout in ms'),
('cors_enabled', 'true', 'boolean', 'api', 'Enable CORS'),
('rate_limit_enabled', 'true', 'boolean', 'api', 'Enable rate limiting'),
('rate_limit_window', '15', 'number', 'api', 'Rate limit window in minutes'),
('rate_limit_max', '100', 'number', 'api', 'Max requests per window'),
('email_notifications', 'true', 'boolean', 'notifications', 'Enable email notifications'),
('smtp_host', 'smtp.gmail.com', 'string', 'notifications', 'SMTP server host'),
('smtp_port', '587', 'number', 'notifications', 'SMTP server port'),
('smtp_secure', 'true', 'boolean', 'notifications', 'Use SSL/TLS for SMTP'),
('push_notifications', 'false', 'boolean', 'notifications', 'Enable push notifications'),
('cache_enabled', 'true', 'boolean', 'performance', 'Enable caching'),
('cache_ttl', '300', 'number', 'performance', 'Cache TTL in seconds'),
('compression_enabled', 'true', 'boolean', 'performance', 'Enable compression'),
('max_file_size', '10', 'number', 'performance', 'Max file size in MB'),
('concurrent_requests', '50', 'number', 'performance', 'Max concurrent requests'),
('session_timeout', '24', 'number', 'security', 'Session timeout in hours'),
('password_min_length', '8', 'number', 'security', 'Minimum password length'),
('two_factor_enabled', 'false', 'boolean', 'security', 'Enable 2FA'),
('audit_logging', 'true', 'boolean', 'security', 'Enable audit logging')
ON CONFLICT (setting_key) DO NOTHING;

