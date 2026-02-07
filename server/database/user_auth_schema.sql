-- User Authentication and Authorization Schema
-- This extends the existing schema with user management

-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'customer', 'provider', 'production');

-- Users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    company_name VARCHAR(255), -- For providers
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions for JWT token management
CREATE TABLE user_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table for customer purchases
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES users(user_id) ON DELETE RESTRICT,
    provider_id INTEGER REFERENCES users(user_id) ON DELETE RESTRICT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, in_production, shipped, delivered, cancelled
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    shipping_address TEXT,
    billing_address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items (sets ordered)
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Provider-specific set pricing and availability
CREATE TABLE provider_sets (
    provider_set_id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    available_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, set_id)
);

-- Messages/Communication system
CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE, -- Optional: link to specific order
    subject VARCHAR(255),
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message attachments
CREATE TABLE message_attachments (
    attachment_id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(message_id) ON DELETE CASCADE,
    media_id INTEGER REFERENCES media_files(media_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Production tasks (for production users)
CREATE TABLE production_tasks (
    task_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    assigned_to INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    task_type VARCHAR(100), -- packing, quality_check, shipping_prep
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    due_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery notes
CREATE TABLE delivery_notes (
    delivery_note_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    shipped_date TIMESTAMP,
    estimated_delivery TIMESTAMP,
    actual_delivery TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_provider_id ON orders(provider_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_set_id ON order_items(set_id);
CREATE INDEX idx_provider_sets_provider_id ON provider_sets(provider_id);
CREATE INDEX idx_provider_sets_set_id ON provider_sets(set_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_order_id ON messages(order_id);
CREATE INDEX idx_production_tasks_order_id ON production_tasks(order_id);
CREATE INDEX idx_production_tasks_assigned_to ON production_tasks(assigned_to);
CREATE INDEX idx_delivery_notes_order_id ON delivery_notes(order_id);

-- Insert default admin user (password: admin123)
-- Password hash for 'admin123' using bcrypt with salt rounds 10
INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active, email_verified) 
VALUES ('admin', 'admin@makerset.com', '$2b$10$rQZ8K9vX8K9vX8K9vX8K9e', 'admin', 'System', 'Administrator', true, true);

-- Insert sample users for testing
INSERT INTO users (username, email, password_hash, role, first_name, last_name, company_name, is_active, email_verified) VALUES
('customer1', 'customer1@example.com', '$2b$10$rQZ8K9vX8K9vX8K9vX8K9e', 'customer', 'John', 'Doe', NULL, true, true),
('provider1', 'provider1@example.com', '$2b$10$rQZ8K9vX8K9vX8K9vX8K9e', 'provider', 'Jane', 'Smith', 'Smith Workshop', true, true),
('production1', 'production1@example.com', '$2b$10$rQZ8K9vX8K9vX8K9vX8K9e', 'production', 'Mike', 'Johnson', 'Production Co', true, true);

