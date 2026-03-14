-- V90: Enable unaccent extension for Vietnamese diacritics-insensitive search
-- Example: searching "Quan ly" will match "Quản lý", "QUẢN LÝ", etc.
CREATE EXTENSION IF NOT EXISTS unaccent;
