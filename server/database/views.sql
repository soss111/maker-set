-- Useful views

-- View: Complete parts list for a set with costs (with translations)
CREATE VIEW v_set_parts_list AS
SELECT 
    s.set_id,
    st.language_id,
    l.language_code,
    st.name AS set_name,
    pt.part_name,
    p.part_number,
    sp.quantity,
    p.unit_of_measure,
    p.unit_cost,
    (sp.quantity * p.unit_cost) AS line_total,
    sp.is_optional
FROM sets s
JOIN set_translations st ON s.set_id = st.set_id
JOIN languages l ON st.language_id = l.language_id
JOIN set_parts sp ON s.set_id = sp.set_id
JOIN parts p ON sp.part_id = p.part_id
JOIN part_translations pt ON p.part_id = pt.part_id AND st.language_id = pt.language_id
ORDER BY s.set_id, st.language_id, pt.part_name;

-- View: Total cost per set (language independent)
CREATE VIEW v_set_costs AS
SELECT 
    s.set_id,
    COUNT(sp.set_part_id) AS total_parts,
    SUM(sp.quantity * p.unit_cost) AS total_cost
FROM sets s
LEFT JOIN set_parts sp ON s.set_id = sp.set_id
LEFT JOIN parts p ON sp.part_id = p.part_id
GROUP BY s.set_id;

-- View: Low stock parts (with all language translations)
CREATE VIEW v_low_stock_parts AS
SELECT 
    p.part_id,
    l.language_code,
    pt.part_name,
    p.part_number,
    p.stock_quantity,
    p.minimum_stock_level,
    (p.minimum_stock_level - p.stock_quantity) AS quantity_needed
FROM parts p
CROSS JOIN languages l
LEFT JOIN part_translations pt ON p.part_id = pt.part_id AND l.language_id = pt.language_id
WHERE p.stock_quantity <= p.minimum_stock_level
ORDER BY quantity_needed DESC, p.part_id, l.language_code;

-- View: Complete set information with all details (multilingual)
CREATE VIEW v_set_details AS
SELECT 
    s.set_id,
    l.language_code,
    st.name,
    st.description,
    s.category,
    s.difficulty_level,
    s.estimated_duration_minutes,
    COUNT(DISTINCT sp.part_id) AS parts_count,
    COUNT(DISTINCT i.instruction_id) AS instructions_count,
    COUNT(DISTINCT sm.media_id) AS media_count
FROM sets s
JOIN set_translations st ON s.set_id = st.set_id
JOIN languages l ON st.language_id = l.language_id
LEFT JOIN set_parts sp ON s.set_id = sp.set_id
LEFT JOIN instructions i ON s.set_id = i.set_id
LEFT JOIN set_media sm ON s.set_id = sm.set_id
GROUP BY s.set_id, l.language_code, st.name, st.description, s.category, s.difficulty_level, s.estimated_duration_minutes;

-- View: Instructions with translations
CREATE VIEW v_instructions_multilingual AS
SELECT 
    i.instruction_id,
    i.set_id,
    st.name AS set_name,
    l.language_code,
    itt.type_name AS instruction_type,
    it_trans.title,
    it_trans.content,
    i.step_order,
    i.estimated_time_minutes
FROM instructions i
JOIN sets s ON i.set_id = s.set_id
JOIN set_translations st ON s.set_id = st.set_id
JOIN languages l ON st.language_id = l.language_id
JOIN instruction_types itt_base ON i.instruction_type_id = itt_base.instruction_type_id
JOIN instruction_type_translations itt ON itt_base.instruction_type_id = itt.instruction_type_id AND l.language_id = itt.language_id
LEFT JOIN instruction_translations it_trans ON i.instruction_id = it_trans.instruction_id AND l.language_id = it_trans.language_id
ORDER BY i.set_id, l.language_code, i.instruction_type_id, i.step_order;

-- Function: Get set details in specific language
CREATE OR REPLACE FUNCTION get_set_with_language(p_set_id INTEGER, p_language_code VARCHAR(10))
RETURNS TABLE (
    set_id INTEGER,
    name VARCHAR(255),
    description TEXT,
    category VARCHAR(100),
    difficulty_level VARCHAR(50),
    recommended_age_min INTEGER,
    recommended_age_max INTEGER,
    estimated_duration_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.set_id,
        st.name,
        st.description,
        s.category,
        s.difficulty_level,
        s.recommended_age_min,
        s.recommended_age_max,
        s.estimated_duration_minutes
    FROM sets s
    JOIN set_translations st ON s.set_id = st.set_id
    JOIN languages l ON st.language_id = l.language_id
    WHERE s.set_id = p_set_id 
    AND l.language_code = p_language_code;
END;
$$ LANGUAGE plpgsql;

-- Function: Get instructions in specific language
CREATE OR REPLACE FUNCTION get_instructions_by_language(
    p_set_id INTEGER, 
    p_language_code VARCHAR(10),
    p_instruction_type_code VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (
    instruction_id INTEGER,
    type_name VARCHAR(100),
    title VARCHAR(255),
    content TEXT,
    step_order INTEGER,
    estimated_time_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.instruction_id,
        itt.type_name,
        it_trans.title,
        it_trans.content,
        i.step_order,
        i.estimated_time_minutes
    FROM instructions i
    JOIN instruction_types it ON i.instruction_type_id = it.instruction_type_id
    JOIN instruction_type_translations itt ON it.instruction_type_id = itt.instruction_type_id
    JOIN languages l ON itt.language_id = l.language_id
    LEFT JOIN instruction_translations it_trans ON i.instruction_id = it_trans.instruction_id AND l.language_id = it_trans.language_id
    WHERE i.set_id = p_set_id 
    AND l.language_code = p_language_code
    AND (p_instruction_type_code IS NULL OR it.type_code = p_instruction_type_code)
    ORDER BY i.step_order;
END;
$$ LANGUAGE plpgsql;
