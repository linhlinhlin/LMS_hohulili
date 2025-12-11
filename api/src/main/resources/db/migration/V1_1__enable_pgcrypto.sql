-- Enable extensions required for UUID generation
-- Must run before migrations that call gen_random_uuid()
-- Note: This migration is PostgreSQL-specific and will be skipped for H2
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Optional, not strictly required for this project but commonly used for UUIDs
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";