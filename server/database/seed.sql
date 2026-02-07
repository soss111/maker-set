-- Insert supported languages
INSERT INTO languages (language_code, language_name, is_default, active) VALUES
('et', 'Eesti', true, true),
('en', 'English', false, true),
('ru', 'Русский', false, true),
('fi', 'Suomi', false, true);

-- Insert default instruction types
INSERT INTO instruction_types (type_code, display_order) VALUES
('preparation', 1),
('teacher', 2),
('student', 3),
('safety', 4);

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
(4, 4, 'Turvallisuus', 'Turvallisuusohjeet ja varotoimet');

-- Example: Insert sample data for Music Box set
INSERT INTO sets (category, difficulty_level, recommended_age_min, recommended_age_max, estimated_duration_minutes) 
VALUES 
('woodwork', 'intermediate', 10, 16, 120);

-- Insert translations for the Music Box set
INSERT INTO set_translations (set_id, language_id, name, description) VALUES
(1, 1, 'Muusikakarp', 'Ehita mehaaniline muusikakarp käsivõlli mehhanismiga'),
(1, 2, 'Music Box', 'Build a mechanical music box with hand-crank mechanism'),
(1, 3, 'Музыкальная шкатулка', 'Создайте механическую музыкальную шкатулку с ручным механизмом'),
(1, 4, 'Musiikkirasia', 'Rakenna mekaaninen musiikkirasia käsikammella');

-- Example: Insert sample parts
INSERT INTO parts (part_number, category, unit_of_measure, unit_cost) VALUES
('WB-BASE-001', 'wood', 'piece', 2.50),
('MB-MECH-001', 'mechanical', 'piece', 5.00),
('GLUE-001', 'adhesive', 'piece', 1.50),
('SAND-001', 'tool', 'piece', 0.30);

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
(4, 4, 'Hiekkapapeeri', 'Hieno hiomapaperi');

-- Example: Create bill of materials for Music Box
INSERT INTO set_parts (set_id, part_id, quantity, is_optional) VALUES
(1, 1, 1, false),
(1, 2, 1, false),
(1, 3, 1, false),
(1, 4, 2, false);

-- Example: Add instructions
INSERT INTO instructions (set_id, instruction_type_id, step_order, estimated_time_minutes) VALUES
(1, 1, 1, 15),
(1, 2, 1, 10),
(1, 3, 1, 20),
(1, 3, 2, 30);

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
(4, 4, 'Kokoa laatikko', 'Levitä liimaa reunoille ja liitä palaset yhteen. Pidä 30 sekuntia.');

-- Example: Add a receipt
INSERT INTO receipts (receipt_number, supplier, purchase_date, total_amount, tax_amount) VALUES
('RCP-2025-001', 'Woodcraft Supplies OÜ', '2025-01-15', 150.00, 30.00);

INSERT INTO receipt_items (receipt_id, part_id, quantity, unit_price, line_total) VALUES
(1, 1, 50, 2.50, 125.00),
(1, 3, 10, 1.50, 15.00);
