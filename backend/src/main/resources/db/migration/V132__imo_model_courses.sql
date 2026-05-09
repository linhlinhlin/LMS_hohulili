-- V132: IMO Model Course Catalog for question bank classification

CREATE TABLE imo_model_courses (
    id            SERIAL PRIMARY KEY,
    code          VARCHAR(10)  NOT NULL UNIQUE,
    title         VARCHAR(250) NOT NULL,
    category      VARCHAR(50)  NOT NULL,
    display_order INT          DEFAULT 0,
    is_active     BOOLEAN      DEFAULT TRUE
);

CREATE INDEX idx_imo_category ON imo_model_courses(category, display_order);

INSERT INTO imo_model_courses (code, title, category, display_order) VALUES
-- Navigation (1.xx)
('1.07', 'Radar Navigation, Radar Plotting and Use of ARPA',                              'Navigation', 1),
('1.08', 'Radar Simulator',                                                                'Navigation', 2),
('1.22', 'Ship Simulator and Bridge Teamwork',                                             'Navigation', 3),
('1.27', 'Operational Use of Electronic Chart Display and Information Systems (ECDIS)',    'Navigation', 4),
('1.34', 'Medical First Aid',                                                              'Navigation', 5),
-- Engineering (3.xx)
('3.04', 'Use of Engine-Room Simulator',                                                   'Engineering', 10),
('3.11', 'Marine Electrical, Electronic and Control Engineering',                          'Engineering', 11),
('3.12', 'Marine Electro-Technology',                                                      'Engineering', 12),
-- Safety (6.xx)
('6.09', 'Basic Training for Oil and Chemical Tanker Cargo Operations',                    'Safety', 20),
('6.10', 'Advanced Training for Oil Tanker Cargo Operations',                              'Safety', 21),
('6.19', 'Maritime Security Awareness Training and Seafarers with Designated Security Duties', 'Safety', 22),
-- Cargo (1.0x)
('1.01', 'Oil Tanker Cargo and Ballast Handling Simulator',                                'Cargo', 30),
('1.02', 'Chemical Tanker Cargo and Ballast Handling Simulator',                           'Cargo', 31),
('1.04', 'Liquefied Gas Tanker Cargo and Ballast Handling Simulator',                      'Cargo', 32),
-- GMDSS (1.2x)
('1.25', 'General Operator Certificate for the Global Maritime Distress and Safety System','GMDSS', 40);

ALTER TABLE questions
    ADD COLUMN imo_course_id INT REFERENCES imo_model_courses(id) ON DELETE SET NULL;

CREATE INDEX idx_questions_imo ON questions(imo_course_id);
