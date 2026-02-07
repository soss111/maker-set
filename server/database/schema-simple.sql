-- Simple SQLite schema for MakerLab Sets Management

CREATE TABLE languages (
    language_id INTEGER PRIMARY KEY AUTOINCREMENT,
    language_code TEXT NOT NULL UNIQUE,
    language_name TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1
);

CREATE TABLE sets (
    set_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    difficulty_level TEXT,
    recommended_age_min INTEGER,
    recommended_age_max INTEGER,
    estimated_duration_minutes INTEGER,
    teacher_manual_pdf TEXT,
    student_manual_pdf TEXT,
    production_manual_pdf TEXT,
    drawing_pdf TEXT,
    active INTEGER DEFAULT 1
);

CREATE TABLE set_translations (
    set_translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    UNIQUE(set_id, language_id)
);

CREATE TABLE parts (
    part_id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number TEXT UNIQUE,
    category TEXT,
    unit_of_measure TEXT,
    unit_cost REAL,
    supplier TEXT,
    supplier_part_number TEXT,
    stock_quantity INTEGER DEFAULT 0,
    minimum_stock_level INTEGER DEFAULT 0,
    image_url TEXT,
    instruction_pdf TEXT,
    drawing_pdf TEXT,
    assembly_notes TEXT,
    safety_notes TEXT
);

CREATE TABLE part_translations (
    part_translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER REFERENCES parts(part_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    part_name TEXT NOT NULL,
    description TEXT,
    UNIQUE(part_id, language_id)
);

CREATE TABLE set_parts (
    set_part_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    part_id INTEGER REFERENCES parts(part_id) ON DELETE RESTRICT,
    quantity REAL NOT NULL,
    is_optional INTEGER DEFAULT 0,
    notes TEXT
);

CREATE TABLE instruction_types (
    instruction_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_code TEXT NOT NULL UNIQUE,
    display_order INTEGER
);

CREATE TABLE instruction_type_translations (
    instruction_type_translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    instruction_type_id INTEGER REFERENCES instruction_types(instruction_type_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    type_name TEXT NOT NULL,
    description TEXT,
    UNIQUE(instruction_type_id, language_id)
);

CREATE TABLE instructions (
    instruction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    instruction_type_id INTEGER REFERENCES instruction_types(instruction_type_id),
    step_order INTEGER,
    estimated_time_minutes INTEGER
);

CREATE TABLE instruction_translations (
    instruction_translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    instruction_id INTEGER REFERENCES instructions(instruction_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    UNIQUE(instruction_id, language_id)
);

CREATE TABLE media_files (
    media_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    mime_type TEXT,
    file_size_bytes INTEGER
);

CREATE TABLE media_translations (
    media_translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_id INTEGER REFERENCES media_files(media_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    description TEXT,
    alt_text TEXT,
    UNIQUE(media_id, language_id)
);

CREATE TABLE set_media (
    set_media_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    media_id INTEGER REFERENCES media_files(media_id) ON DELETE CASCADE,
    media_category TEXT,
    display_order INTEGER,
    is_featured INTEGER DEFAULT 0
);

CREATE TABLE instruction_media (
    instruction_media_id INTEGER PRIMARY KEY AUTOINCREMENT,
    instruction_id INTEGER REFERENCES instructions(instruction_id) ON DELETE CASCADE,
    media_id INTEGER REFERENCES media_files(media_id) ON DELETE CASCADE,
    display_order INTEGER
);

CREATE TABLE receipts (
    receipt_id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_number TEXT UNIQUE,
    supplier TEXT,
    purchase_date TEXT NOT NULL,
    total_amount REAL,
    tax_amount REAL,
    currency TEXT DEFAULT 'EUR',
    payment_method TEXT,
    notes TEXT,
    receipt_image_url TEXT
);

CREATE TABLE receipt_items (
    receipt_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER REFERENCES receipts(receipt_id) ON DELETE CASCADE,
    part_id INTEGER REFERENCES parts(part_id),
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    line_total REAL NOT NULL,
    notes TEXT
);

CREATE TABLE preparation_checklist (
    checklist_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    task_order INTEGER,
    estimated_time_minutes INTEGER,
    is_mandatory INTEGER DEFAULT 1
);

CREATE TABLE checklist_translations (
    checklist_translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    checklist_id INTEGER REFERENCES preparation_checklist(checklist_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    description TEXT,
    UNIQUE(checklist_id, language_id)
);

CREATE TABLE workshop_sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(set_id),
    session_date TEXT NOT NULL,
    school_name TEXT,
    teacher_name TEXT,
    student_count INTEGER,
    notes TEXT
);
