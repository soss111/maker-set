-- SQLite: tools tables required by dashboard and system alerts
-- Safe to run when tools table is missing (CREATE TABLE IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS tools (
    tool_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_number TEXT UNIQUE,
    tool_name TEXT,
    category TEXT,
    tool_type TEXT,
    condition_status TEXT DEFAULT 'good',
    location TEXT,
    purchase_date TEXT,
    last_maintenance_date TEXT,
    next_maintenance_date TEXT,
    notes TEXT,
    image_url TEXT,
    description TEXT,
    safety_instructions TEXT,
    translations TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tool_translations (
    tool_translation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_id INTEGER REFERENCES tools(tool_id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(language_id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    description TEXT,
    safety_instructions TEXT,
    UNIQUE(tool_id, language_id)
);

CREATE TABLE IF NOT EXISTS set_tools (
    set_tool_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(set_id) ON DELETE CASCADE,
    tool_id INTEGER REFERENCES tools(tool_id) ON DELETE RESTRICT,
    quantity INTEGER DEFAULT 1,
    is_required INTEGER DEFAULT 1,
    is_optional INTEGER DEFAULT 0,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE INDEX IF NOT EXISTS idx_set_tools_set_id ON set_tools(set_id);
CREATE INDEX IF NOT EXISTS idx_set_tools_tool_id ON set_tools(tool_id);
