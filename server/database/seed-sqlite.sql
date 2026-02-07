-- Seed data for SQLite

-- Insert default languages
INSERT INTO languages (language_code, language_name, is_default, active) VALUES
('en', 'English', 1, 1),
('et', 'Eesti', 0, 1),
('ru', 'Русский', 0, 1),
('fi', 'Suomi', 0, 1);

-- Insert instruction types
INSERT INTO instruction_types (type_code, display_order) VALUES
('preparation', 1),
('teacher', 2),
('student', 3);

-- Insert instruction type translations
INSERT INTO instruction_type_translations (instruction_type_id, language_id, type_name, description) VALUES
(1, 1, 'Preparation', 'Preparation instructions for teachers'),
(1, 2, 'Ettevalmistus', 'Õpetajate ettevalmistusjuhendid'),
(1, 3, 'Подготовка', 'Инструкции по подготовке для учителей'),
(1, 4, 'Valmistelu', 'Opettajien valmisteluohjeet'),
(2, 1, 'Teacher Manual', 'Instructions for teachers'),
(2, 2, 'Õpetaja käsiraamat', 'Juhendid õpetajatele'),
(2, 3, 'Руководство учителя', 'Инструкции для учителей'),
(2, 4, 'Opettajan käsikirja', 'Ohjeet opettajille'),
(3, 1, 'Student Manual', 'Instructions for students'),
(3, 2, 'Õpilase käsiraamat', 'Juhendid õpilastele'),
(3, 3, 'Руководство ученика', 'Инструкции для учеников'),
(3, 4, 'Oppilaan käsikirja', 'Ohjeet oppilaille');
