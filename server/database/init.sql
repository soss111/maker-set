-- This file will be executed when PostgreSQL container starts
-- It combines schema, seed data, and views

-- MakerLab Sets Management Database Schema

-- Languages table
CREATE TABLE IF NOT EXISTS languages (
    language_id SERIAL PRIMARY KEY,
    language_code VARCHAR(10) NOT NULL UNIQUE,
    language_name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Core tables
CREATE TABLE IF NOT EXISTS sets (
    set_id SERIAL PRIMARY KEY,
    category VARCHAR(100),
    difficulty_level VARCHAR(50),
    recommended_age_min INTEGER,
    recommended_age_max INTEGER,
    estimated_duration_minutes INTEGER,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Multilingual set information
CREATE TABLE IF NOT EXISTS set_translations (
    set_translation_id SERIAL PRIMARY KEY,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    UNIQUE(set_id, language_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parts/Components master list
CREATE TABLE IF NOT EXISTS parts (
    part_id SERIAL PRIMARY KEY,
    part_number VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    unit_of_measure VARCHAR(50),
    unit_cost DECIMAL(10, 2),
    supplier VARCHAR(255),
    supplier_part_number VARCHAR(100),
    stock_quantity INTEGER DEFAULT 0,
    minimum_stock_level INTEGER DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Multilingual parts information
CREATE TABLE IF NOT EXISTS part_translations (
    part_translation_id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES parts(part_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    part_name VARCHAR(255) NOT NULL,
    description TEXT,
    UNIQUE(part_id, language_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bill of Materials - Parts needed for each set
CREATE TABLE IF NOT EXISTS set_parts (
    set_part_id SERIAL PRIMARY KEY,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    part_id INTEGER REFERENCES parts(part_id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 2) NOT NULL,
    is_optional BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Instructions types
CREATE TABLE IF NOT EXISTS instruction_types (
    instruction_type_id SERIAL PRIMARY KEY,
    type_code VARCHAR(50) NOT NULL UNIQUE,
    display_order INTEGER
);

-- Multilingual instruction type names
CREATE TABLE IF NOT EXISTS instruction_type_translations (
    instruction_type_translation_id SERIAL PRIMARY KEY,
    instruction_type_id INTEGER REFERENCES instruction_types(instruction_type_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    UNIQUE(instruction_type_id, language_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Instructions for sets
CREATE TABLE IF NOT EXISTS instructions (
    instruction_id SERIAL PRIMARY KEY,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    instruction_type_id INTEGER REFERENCES instruction_types(instruction_type_id),
    step_order INTEGER,
    estimated_time_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Multilingual instruction content
CREATE TABLE IF NOT EXISTS instruction_translations (
    instruction_translation_id SERIAL PRIMARY KEY,
    instruction_id INTEGER REFERENCES instructions(instruction_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    UNIQUE(instruction_id, language_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media files
CREATE TABLE IF NOT EXISTS media_files (
    media_id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Multilingual media descriptions
CREATE TABLE IF NOT EXISTS media_translations (
    media_translation_id SERIAL PRIMARY KEY,
    media_id INTEGER REFERENCES media_files(media_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    description TEXT,
    alt_text VARCHAR(255),
    UNIQUE(media_id, language_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link media to sets
CREATE TABLE IF NOT EXISTS set_media (
    set_media_id SERIAL PRIMARY KEY,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    media_id INTEGER REFERENCES media_files(media_id) ON DELETE CASCADE,
    media_category VARCHAR(100),
    display_order INTEGER,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link media to specific instruction steps
CREATE TABLE IF NOT EXISTS instruction_media (
    instruction_media_id SERIAL PRIMARY KEY,
    instruction_id INTEGER REFERENCES instructions(instruction_id) ON DELETE CASCADE,
    media_id INTEGER REFERENCES media_files(media_id) ON DELETE CASCADE,
    display_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Receipts/Purchase tracking for parts
CREATE TABLE IF NOT EXISTS receipts (
    receipt_id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(100) UNIQUE,
    supplier VARCHAR(255),
    purchase_date DATE NOT NULL,
    total_amount DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_method VARCHAR(50),
    notes TEXT,
    receipt_image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual items on receipts
CREATE TABLE IF NOT EXISTS receipt_items (
    receipt_item_id SERIAL PRIMARY KEY,
    receipt_id INTEGER REFERENCES receipts(receipt_id) ON DELETE CASCADE,
    part_id INTEGER REFERENCES parts(part_id),
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Set preparation checklist
CREATE TABLE IF NOT EXISTS preparation_checklist (
    checklist_id SERIAL PRIMARY KEY,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    task_order INTEGER,
    estimated_time_minutes INTEGER,
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Multilingual checklist items
CREATE TABLE IF NOT EXISTS checklist_translations (
    checklist_translation_id SERIAL PRIMARY KEY,
    checklist_id INTEGER REFERENCES preparation_checklist(checklist_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    UNIQUE(checklist_id, language_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workshop sessions tracking
CREATE TABLE IF NOT EXISTS workshop_sessions (
    session_id SERIAL PRIMARY KEY,
    set_id INTEGER REFERENCES sets(set_id),
    session_date DATE NOT NULL,
    school_name VARCHAR(255),
    teacher_name VARCHAR(255),
    student_count INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_set_translations_set_id ON set_translations(set_id);
CREATE INDEX IF NOT EXISTS idx_set_translations_language_id ON set_translations(language_id);
CREATE INDEX IF NOT EXISTS idx_part_translations_part_id ON part_translations(part_id);
CREATE INDEX IF NOT EXISTS idx_part_translations_language_id ON part_translations(language_id);
CREATE INDEX IF NOT EXISTS idx_instruction_translations_instruction_id ON instruction_translations(instruction_id);
CREATE INDEX IF NOT EXISTS idx_instruction_translations_language_id ON instruction_translations(language_id);
CREATE INDEX IF NOT EXISTS idx_set_parts_set_id ON set_parts(set_id);
CREATE INDEX IF NOT EXISTS idx_set_parts_part_id ON set_parts(part_id);
CREATE INDEX IF NOT EXISTS idx_instructions_set_id ON instructions(set_id);
CREATE INDEX IF NOT EXISTS idx_instructions_type ON instructions(instruction_type_id);
CREATE INDEX IF NOT EXISTS idx_set_media_set_id ON set_media(set_id);
CREATE INDEX IF NOT EXISTS idx_instruction_media_instruction_id ON instruction_media(instruction_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_part_id ON receipt_items(part_id);
CREATE INDEX IF NOT EXISTS idx_parts_part_number ON parts(part_number);
CREATE INDEX IF NOT EXISTS idx_workshop_sessions_date ON workshop_sessions(session_date);

-- Insert supported languages
INSERT INTO languages (language_code, language_name, is_default, active) VALUES
('et', 'Eesti', true, true),
('en', 'English', false, true),
('ru', 'Русский', false, true),
('fi', 'Suomi', false, true)
ON CONFLICT (language_code) DO NOTHING;

-- Insert default instruction types
INSERT INTO instruction_types (type_code, display_order) VALUES
('preparation', 1),
('teacher', 2),
('student', 3),
('safety', 4)
ON CONFLICT (type_code) DO NOTHING;

-- Insert instruction type translations
INSERT INTO instruction_type_translations (instruction_type_id, language_id, type_name, description) VALUES
-- Estonian
(1, 1, 'Ettevalmistus', 'Juhised komplekti ettevalmistamiseks enne töötuba'),
(2, 1, 'Õpetajale', 'Juhised õpetajatele/juhendajatele'),
(3, 1, 'Õpilasele', 'Juhised õpilastele'),
(4, 1, 'Ohutus', 'Ohutusjuhised ja ettevaatusabinõud'),
-- English
(1, 2, 'Preparation', 'Instructions for preparing the set before workshop'),
(2, 2, 'Teacher', 'Instructions for teachers/instructors'),
(3, 2, 'Student', 'Instructions for students'),
(4, 2, 'Safety', 'Safety guidelines and precautions'),
-- Russian
(1, 3, 'Подготовка', 'Инструкции по подготовке набора перед мастер-классом'),
(2, 3, 'Учителю', 'Инструкции для учителей/инструкторов'),
(3, 3, 'Ученику', 'Инструкции для учеников'),
(4, 3, 'Безопасность', 'Правила безопасности и меры предосторожности'),
-- Finnish
(1, 4, 'Valmistelu', 'Ohjeet setin valmisteluun ennen työpajaa'),
(2, 4, 'Opettajalle', 'Ohjeet opettajille/ohjaajille'),
(3, 4, 'Oppilaalle', 'Ohjeet oppilaille'),
(4, 4, 'Turvallisuus', 'Turvallisuusohjeet ja varotoimet')
ON CONFLICT (instruction_type_id, language_id) DO NOTHING;

-- Example: Insert sample data for Music Box set
INSERT INTO sets (category, difficulty_level, recommended_age_min, recommended_age_max, estimated_duration_minutes) 
VALUES 
('woodwork', 'intermediate', 10, 16, 120)
ON CONFLICT DO NOTHING;

-- Insert translations for the Music Box set
INSERT INTO set_translations (set_id, language_id, name, description) VALUES
(1, 1, 'Muusikakarp', 'Ehita mehaaniline muusikakarp käsivõlli mehhanismiga'),
(1, 2, 'Music Box', 'Build a mechanical music box with hand-crank mechanism'),
(1, 3, 'Музыкальная шкатулка', 'Создайте механическую музыкальную шкатулку с ручным механизмом'),
(1, 4, 'Musiikkirasia', 'Rakenna mekaaninen musiikkirasia käsikammella')
ON CONFLICT (set_id, language_id) DO NOTHING;

-- Example: Insert sample parts
INSERT INTO parts (part_number, category, unit_of_measure, unit_cost) VALUES
('WB-BASE-001', 'wood', 'piece', 2.50),
('MB-MECH-001', 'mechanical', 'piece', 5.00),
('GLUE-001', 'adhesive', 'piece', 1.50),
('SAND-001', 'tool', 'piece', 0.30)
ON CONFLICT (part_number) DO NOTHING;

-- Insert part translations
INSERT INTO part_translations (part_id, language_id, part_name, description) VALUES
-- Estonian
(1, 1, 'Puitkasti põhi (10x10cm)', 'Eellõigatud puitpõhi muusikakarbile'),
(2, 1, 'Muusikakasti mehhanism', 'Vedrumootoriga muusikamehhanism'),
(3, 1, 'Puiduliim 50ml', 'Puiduliim'),
(4, 1, 'Liivapaberipaber', 'Peenikameline liivapaberipaber'),
-- English
(1, 2, 'Wooden box base (10x10cm)', 'Pre-cut wooden base for music box'),
(2, 2, 'Music box mechanism', 'Wind-up music mechanism'),
(3, 2, 'Wood glue 50ml', 'Wood adhesive'),
(4, 2, 'Sandpaper sheet', 'Fine grain sandpaper'),
-- Russian
(1, 3, 'Деревянная основа коробки (10x10см)', 'Предварительно вырезанная деревянная основа для музыкальной шкатулки'),
(2, 3, 'Механизм музыкальной шкатулки', 'Заводной музыкальный механизм'),
(3, 3, 'Столярный клей 50мл', 'Клей для дерева'),
(4, 3, 'Наждачная бумага', 'Мелкозернистая наждачная бумага'),
-- Finnish
(1, 4, 'Puinen laatikko pohja (10x10cm)', 'Esileikkaava puupohja musiikkirasioille'),
(2, 4, 'Musiikkirasian mekanismi', 'Jousimoottorilla varustettu musiikkimekanismi'),
(3, 4, 'Puuliima 50ml', 'Puuliima'),
(4, 4, 'Hiekkapapeeri', 'Hieno hiomapaperi')
ON CONFLICT (part_id, language_id) DO NOTHING;

-- Example: Create bill of materials for Music Box
INSERT INTO set_parts (set_id, part_id, quantity, is_optional) VALUES
(1, 1, 1, false),
(1, 2, 1, false),
(1, 3, 1, false),
(1, 4, 2, false)
ON CONFLICT DO NOTHING;

-- Example: Add instructions
INSERT INTO instructions (set_id, instruction_type_id, step_order, estimated_time_minutes) VALUES
(1, 1, 1, 15),
(1, 2, 1, 10),
(1, 3, 1, 20),
(1, 3, 2, 30)
ON CONFLICT DO NOTHING;

-- Insert instruction translations
INSERT INTO instruction_translations (instruction_id, language_id, title, content) VALUES
-- Estonian
(1, 1, 'Valmista tööala ette', 'Seadista töölauad kaitsekattega. Veendu, et kõik osad on loetud ja organiseeritud.'),
(2, 1, 'Tutvustamine õpilastele', 'Selgita muusikakarpide ajalugu ja näita valmis näidet. Demonstreeri mehhanismi.'),
(3, 1, 'Liiva puittükid', 'Kasuta liivapaperit, et siluda kõik puittükkide servad. Tööta ühes suunas.'),
(4, 1, 'Asenda karp kokku', 'Kanna liim servadele ja ühenda tükid kokku. Hoia 30 sekundit.'),
-- English
(1, 2, 'Prepare workspace', 'Set up work tables with protective covering. Ensure all parts are counted and organized.'),
(2, 2, 'Introduction to students', 'Explain the history of music boxes and show the completed example. Demonstrate the mechanism.'),
(3, 2, 'Sand wooden pieces', 'Use sandpaper to smooth all edges of the wooden pieces. Work in one direction.'),
(4, 2, 'Assemble the box', 'Apply glue to the edges and join pieces together. Hold for 30 seconds.'),
-- Russian
(1, 3, 'Подготовьте рабочее место', 'Установите рабочие столы с защитным покрытием. Убедитесь, что все детали подсчитаны и организованы.'),
(2, 3, 'Представление ученикам', 'Объясните историю музыкальных шкатулок и покажите готовый пример. Продемонстрируйте механизм.'),
(3, 3, 'Отшлифуйте деревянные детали', 'Используйте наждачную бумагу, чтобы сгладить все края деревянных деталей. Работайте в одном направлении.'),
(4, 3, 'Соберите коробку', 'Нанесите клей на края и соедините детали вместе. Держите 30 секунд.'),
-- Finnish
(1, 4, 'Valmistele työtila', 'Järjestä työpöydät suojakannella. Varmista, että kaikki osat on laskettu ja järjestetty.'),
(2, 4, 'Esittely opiskelijoille', 'Selitä musiikkirasioiden historia ja näytä valmis esimerkki. Demonstroi mekanismi.'),
(3, 4, 'Hio puiset palaset', 'Käytä hiekkapaperia pehmentääksesi kaikki puisten palojen reunat. Työskentele yhteen suuntaan.'),
(4, 4, 'Kokoa laatikko', 'Levitä liimaa reunoille ja liitä palaset yhteen. Pidä 30 sekuntia.')
ON CONFLICT (instruction_id, language_id) DO NOTHING;

-- Example: Add a receipt
INSERT INTO receipts (receipt_number, supplier, purchase_date, total_amount, tax_amount) VALUES
('RCP-2025-001', 'Woodcraft Supplies OÜ', '2025-01-15', 150.00, 30.00)
ON CONFLICT (receipt_number) DO NOTHING;

INSERT INTO receipt_items (receipt_id, part_id, quantity, unit_price, line_total) VALUES
(1, 1, 50, 2.50, 125.00),
(1, 3, 10, 1.50, 15.00)
ON CONFLICT DO NOTHING;
