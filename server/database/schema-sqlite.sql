-- MakerLab Sets Management Database Schema for SQLite

-- Languages table
CREATE TABLE languages (
    language_id INTEGER PRIMARY KEY AUTOINCREMENT,
    language_code VARCHAR(10) NOT NULL UNIQUE,
    language_name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Core tables
CREATE TABLE sets (
    set_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category VARCHAR(100),
    difficulty_level VARCHAR(50),
    recommended_age_min INTEGER,
    recommended_age_max INTEGER,
    estimated_duration_minutes INTEGER,
    teacher_manual_pdf TEXT,
    student_manual_pdf TEXT,
    production_manual_pdf TEXT,
    drawing_pdf TEXT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Multilingual set information
CREATE TABLE set_translations (
    set_translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    UNIQUE(set_id, language_id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Parts/Components master list
CREATE TABLE parts (
    part_id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    unit_of_measure VARCHAR(50),
    unit_cost DECIMAL(10, 2),
    supplier VARCHAR(255),
    supplier_part_number VARCHAR(100),
    stock_quantity INTEGER DEFAULT 0,
    minimum_stock_level INTEGER DEFAULT 0,
    image_url TEXT,
    instruction_pdf TEXT,
    drawing_pdf TEXT,
    assembly_notes TEXT,
    safety_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Multilingual parts information
CREATE TABLE part_translations (
    part_translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER REFERENCES parts(part_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    part_name VARCHAR(255) NOT NULL,
    description TEXT,
    UNIQUE(part_id, language_id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bill of Materials - Parts needed for each set
CREATE TABLE set_parts (
    set_part_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    part_id INTEGER REFERENCES parts(part_id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 2) NOT NULL,
    is_optional BOOLEAN DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Instructions types
CREATE TABLE instruction_types (
    instruction_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_code VARCHAR(50) NOT NULL UNIQUE,
    display_order INTEGER
);

-- Multilingual instruction type names
CREATE TABLE instruction_type_translations (
    instruction_type_translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    instruction_type_id INTEGER REFERENCES instruction_types(instruction_type_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    UNIQUE(instruction_type_id, language_id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Instructions for sets
CREATE TABLE instructions (
    instruction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    instruction_type_id INTEGER REFERENCES instruction_types(instruction_type_id),
    step_order INTEGER,
    estimated_time_minutes INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Multilingual instruction content
CREATE TABLE instruction_translations (
    instruction_translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    instruction_id INTEGER REFERENCES instructions(instruction_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    UNIQUE(instruction_id, language_id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Media files (photos, drawings, diagrams)
CREATE TABLE media_files (
    media_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    file_size_bytes INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Multilingual media descriptions
CREATE TABLE media_translations (
    media_translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_id INTEGER REFERENCES media_files(media_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    description TEXT,
    alt_text VARCHAR(255),
    UNIQUE(media_id, language_id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Link media to sets
CREATE TABLE set_media (
    set_media_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    media_id INTEGER REFERENCES media_files(media_id) ON DELETE CASCADE,
    media_category VARCHAR(100),
    display_order INTEGER,
    is_featured BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Link media to specific instruction steps
CREATE TABLE instruction_media (
    instruction_media_id INTEGER PRIMARY KEY AUTOINCREMENT,
    instruction_id INTEGER REFERENCES instructions(instruction_id) ON DELETE CASCADE,
    media_id INTEGER REFERENCES media_files(media_id) ON DELETE CASCADE,
    display_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Receipts/Purchase tracking for parts
CREATE TABLE receipts (
    receipt_id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_number VARCHAR(100) UNIQUE,
    supplier VARCHAR(255),
    purchase_date DATE NOT NULL,
    total_amount DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_method VARCHAR(50),
    notes TEXT,
    receipt_image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Individual items on receipts
CREATE TABLE receipt_items (
    receipt_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER REFERENCES receipts(receipt_id) ON DELETE CASCADE,
    part_id INTEGER REFERENCES parts(part_id),
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Set preparation checklist
CREATE TABLE preparation_checklist (
    checklist_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    task_order INTEGER,
    estimated_time_minutes INTEGER,
    is_mandatory BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Multilingual checklist items
CREATE TABLE checklist_translations (
    checklist_translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    checklist_id INTEGER REFERENCES preparation_checklist(checklist_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    UNIQUE(checklist_id, language_id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workshop sessions tracking
CREATE TABLE workshop_sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(set_id),
    session_date DATE NOT NULL,
    school_name VARCHAR(255),
    teacher_name VARCHAR(255),
    student_count INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_set_translations_set_id ON set_translations(set_id);
CREATE INDEX idx_set_translations_language_id ON set_translations(language_id);
CREATE INDEX idx_part_translations_part_id ON part_translations(part_id);
CREATE INDEX idx_part_translations_language_id ON part_translations(language_id);
CREATE INDEX idx_instruction_translations_instruction_id ON instruction_translations(instruction_id);
CREATE INDEX idx_instruction_translations_language_id ON instruction_translations(language_id);
CREATE INDEX idx_set_parts_set_id ON set_parts(set_id);
CREATE INDEX idx_set_parts_part_id ON set_parts(part_id);
CREATE INDEX idx_instructions_set_id ON instructions(set_id);
CREATE INDEX idx_instructions_type ON instructions(instruction_type_id);
CREATE INDEX idx_set_media_set_id ON set_media(set_id);
CREATE INDEX idx_instruction_media_instruction_id ON instruction_media(instruction_id);
CREATE INDEX idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX idx_receipt_items_part_id ON receipt_items(part_id);
CREATE INDEX idx_parts_part_number ON parts(part_number);
CREATE INDEX idx_workshop_sessions_date ON workshop_sessions(session_date);
