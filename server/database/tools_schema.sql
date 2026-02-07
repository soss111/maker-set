-- Tools table for managing tools needed for sets
CREATE TABLE tools (
    tool_id SERIAL PRIMARY KEY,
    tool_number VARCHAR(100) UNIQUE, -- SKU or internal code
    category VARCHAR(100), -- e.g., 'hand_tool', 'power_tool', 'safety_equipment',
    tool_type VARCHAR(100), -- e.g., 'screwdriver', 'drill', 'knife', 'hot_glue_gun',
    condition_status VARCHAR(50) DEFAULT 'good', -- e.g., 'good', 'needs_repair', 'broken'
    location VARCHAR(255), -- where the tool is stored
    purchase_date DATE,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    notes TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Multilingual tools information
CREATE TABLE tool_translations (
    tool_translation_id SERIAL PRIMARY KEY,
    tool_id INTEGER REFERENCES tools(tool_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL,
    description TEXT,
    safety_instructions TEXT,
    UNIQUE(tool_id, language_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link tools to sets (tools needed for each set)
CREATE TABLE set_tools (
    set_tool_id SERIAL PRIMARY KEY,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    tool_id INTEGER REFERENCES tools(tool_id) ON DELETE RESTRICT,
    quantity INTEGER DEFAULT 1,
    is_required BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_tool_translations_tool_id ON tool_translations(tool_id);
CREATE INDEX idx_tool_translations_language_id ON tool_translations(language_id);
CREATE INDEX idx_set_tools_set_id ON set_tools(set_id);
CREATE INDEX idx_set_tools_tool_id ON set_tools(tool_id);
CREATE INDEX idx_tools_tool_number ON tools(tool_number);
CREATE INDEX idx_tools_category ON tools(category);
CREATE INDEX idx_tools_tool_type ON tools(tool_type);

-- Insert sample tools
INSERT INTO tools (tool_number, category, tool_type, condition_status, location, notes) VALUES
('TOOL-SD-001', 'hand_tool', 'screwdriver', 'good', 'Tool Cabinet A', 'Phillips head screwdriver set'),
('TOOL-DR-001', 'power_tool', 'drill', 'good', 'Power Tool Station', 'Cordless drill with multiple bits'),
('TOOL-KN-001', 'hand_tool', 'knife', 'good', 'Safety Cabinet', 'Utility knife with retractable blade'),
('TOOL-HG-001', 'power_tool', 'hot_glue_gun', 'good', 'Craft Station', 'High-temperature hot glue gun'),
('TOOL-HM-001', 'hand_tool', 'hammer', 'good', 'Tool Cabinet A', 'Claw hammer'),
('TOOL-PL-001', 'hand_tool', 'pliers', 'good', 'Tool Cabinet A', 'Needle nose pliers'),
('TOOL-SW-001', 'hand_tool', 'saw', 'good', 'Tool Cabinet B', 'Hand saw for wood'),
('TOOL-ME-001', 'hand_tool', 'measuring_tape', 'good', 'Measuring Station', '25ft measuring tape'),
('TOOL-SA-001', 'safety_equipment', 'safety_goggles', 'good', 'Safety Station', 'Protective eyewear'),
('TOOL-GL-001', 'safety_equipment', 'gloves', 'good', 'Safety Station', 'Work gloves');

-- Insert tool translations
INSERT INTO tool_translations (tool_id, language_id, tool_name, description, safety_instructions) VALUES
-- Estonian
(1, 1, 'Kruvikeeraja', 'Phillips peaga kruvikeerajate komplekt', 'Kasuta kindalt ja hoia teravad otsad eemal'),
(2, 1, 'Puur', 'Juhtmevaba puur mitme peaga', 'Kasuta kaitseprille ja hoia käed eemal teravatest osadest'),
(3, 1, 'Nuga', 'Kasutusnuga tagasitõmbatava teraga', 'Kasuta ettevaatlikult ja hoia terav ots eemal'),
(4, 1, 'Kuumliimipüss', 'Kõrge temperatuuriga kuumliimipüss', 'Kasuta kaitsekindlaid kätte ja hoia eemal nahast'),
(5, 1, 'Haamer', 'Küünisega haamer', 'Kasuta kindalt ja hoia käed eemal löögiosast'),
(6, 1, 'Pihid', 'Nõelapihid', 'Kasuta ettevaatlikult ja hoia sõrmed eemal'),
(7, 1, 'Saag', 'Käsisaag puidu jaoks', 'Kasuta kindalt ja hoia käed eemal teravast servast'),
(8, 1, 'Mõõdulint', '25 jalga mõõdulint', 'Kasuta ettevaatlikult ja hoia eemal teravatest servadest'),
(9, 1, 'Kaitseprillid', 'Kaitseprillid', 'Kanna alati töötamise ajal'),
(10, 1, 'Kindad', 'Töökindad', 'Kanna alati töötamise ajal'),
-- English
(1, 2, 'Screwdriver', 'Phillips head screwdriver set', 'Use firmly and keep sharp points away'),
(2, 2, 'Drill', 'Cordless drill with multiple bits', 'Use safety goggles and keep hands away from sharp parts'),
(3, 2, 'Knife', 'Utility knife with retractable blade', 'Use carefully and keep sharp edge away'),
(4, 2, 'Hot Glue Gun', 'High-temperature hot glue gun', 'Use protective gloves and keep away from skin'),
(5, 2, 'Hammer', 'Claw hammer', 'Use firmly and keep hands away from striking surface'),
(6, 2, 'Pliers', 'Needle nose pliers', 'Use carefully and keep fingers away'),
(7, 2, 'Saw', 'Hand saw for wood', 'Use firmly and keep hands away from sharp edge'),
(8, 2, 'Measuring Tape', '25ft measuring tape', 'Use carefully and keep away from sharp edges'),
(9, 2, 'Safety Goggles', 'Protective eyewear', 'Wear at all times during work'),
(10, 2, 'Gloves', 'Work gloves', 'Wear at all times during work'),
-- Russian
(1, 3, 'Отвёртка', 'Набор отвёрток с крестовой головкой', 'Используйте крепко и держите острые концы подальше'),
(2, 3, 'Дрель', 'Аккумуляторная дрель с несколькими битами', 'Используйте защитные очки и держите руки подальше от острых частей'),
(3, 3, 'Нож', 'Универсальный нож с выдвижным лезвием', 'Используйте осторожно и держите острое лезвие подальше'),
(4, 3, 'Клеевой пистолет', 'Высокотемпературный клеевой пистолет', 'Используйте защитные перчатки и держите подальше от кожи'),
(5, 3, 'Молоток', 'Молоток с гвоздодёром', 'Используйте крепко и держите руки подальше от ударной поверхности'),
(6, 3, 'Плоскогубцы', 'Длинногубцы', 'Используйте осторожно и держите пальцы подальше'),
(7, 3, 'Пила', 'Ручная пила для дерева', 'Используйте крепко и держите руки подальше от острого края'),
(8, 3, 'Рулетка', '25-футовая рулетка', 'Используйте осторожно и держите подальше от острых краёв'),
(9, 3, 'Защитные очки', 'Защитные очки', 'Носите всё время во время работы'),
(10, 3, 'Перчатки', 'Рабочие перчатки', 'Носите всё время во время работы'),
-- Finnish
(1, 4, 'Ruuvimeisseli', 'Phillips-päätteen ruuvimeisselikokoelma', 'Käytä lujasti ja pidä terävät kärjet poissa'),
(2, 4, 'Porakone', 'Johtoton porakone useilla terillä', 'Käytä suojalaseja ja pidä kädet poissa terävistä osista'),
(3, 4, 'Veitsi', 'Työkaluveitsi vetäytyvällä terällä', 'Käytä varovasti ja pidä terävä reuna poissa'),
(4, 4, 'Kuumaliimapistooli', 'Korkean lämpötilan kuumaliimapistooli', 'Käytä suojakäsineitä ja pidä poissa ihosta'),
(5, 4, 'Vasara', 'Kynsivasara', 'Käytä lujasti ja pidä kädet poissa lyöntipinnasta'),
(6, 4, 'Pihdit', 'Neulapihdit', 'Käytä varovasti ja pidä sormet poissa'),
(7, 4, 'Saha', 'Käsikäyttöinen puusaha', 'Käytä lujasti ja pidä kädet poissa terävästä reunasta'),
(8, 4, 'Mittanauha', '25 jalan mittanauha', 'Käytä varovasti ja pidä poissa terävistä reunoista'),
(9, 4, 'Suojalasit', 'Suojalasit', 'Käytä koko ajan työskentelyn aikana'),
(10, 4, 'Käsineet', 'Työkäsineet', 'Käytä koko ajan työskentelyn aikana');
