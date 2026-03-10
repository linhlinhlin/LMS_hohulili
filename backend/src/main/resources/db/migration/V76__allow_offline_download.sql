ALTER TABLE courses ADD COLUMN allow_offline_download BOOLEAN NOT NULL DEFAULT true;
UPDATE courses SET allow_offline_download = false WHERE delivery_mode = 'INSTRUCTOR_LED';
