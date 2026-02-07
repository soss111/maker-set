-- SQLite: users, orders, system_settings and related tables for auth/shop
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS / INSERT OR IGNORE)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer', 'provider', 'production')),
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    company_name TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT,
    provider_code TEXT,
    is_active INTEGER DEFAULT 1,
    email_verified INTEGER DEFAULT 0,
    last_login TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES users(user_id),
    provider_id INTEGER REFERENCES users(user_id),
    order_date TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending',
    total_amount REAL NOT NULL,
    currency TEXT DEFAULT 'EUR',
    shipping_address TEXT,
    billing_address TEXT,
    customer_email TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_provider_id ON orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    set_id INTEGER REFERENCES sets(set_id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    line_total REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Provider sets (optional FK to sets)
CREATE TABLE IF NOT EXISTS provider_sets (
    provider_set_id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    set_id INTEGER,
    price REAL NOT NULL,
    available_quantity INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, set_id)
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'string',
    category TEXT DEFAULT 'general',
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Default admin (password: admin123) - bcrypt hash
INSERT OR IGNORE INTO users (username, email, password_hash, role, first_name, last_name, is_active, email_verified)
VALUES ('admin', 'admin@makerset.com', '$2a$10$Ws.9lQqiwnmzqZpn6Nj1gOmqInsmOrb9DBCEO3gqOovPjicIAn.QG', 'admin', 'System', 'Administrator', 1, 1);

-- Shipping/settings expected by CartContext and others
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, category) VALUES
('shipping_handling_cost', '15', 'number', 'general'),
('minimum_order_amount', '0', 'number', 'general'),
('free_shipping_threshold', '0', 'number', 'general'),
('currency', 'EUR', 'string', 'general');
