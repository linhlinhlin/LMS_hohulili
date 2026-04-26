-- V119: Multi-org foundation (issue #231 — Phase 1).
--
-- Goal: enforce mọi user thuộc 1 organization. Default platform org
-- "HoLiLiHu Org" (renamed từ "Wiii Org" V64) cho system ADMIN +
-- người dùng đăng ký cá nhân.
--
-- Architecture: Option B Hybrid (sub-agent research 12 SOTA platforms).
-- - PLATFORM org: nơi vận hành platform, ADMIN home org
-- - PARTNER org: tổ chức đối tác (trường khác, công ty đào tạo)
-- - INTERNAL org: tổ chức nội bộ (Phase 2+)
--
-- Backward compat: V64 đã backfill users.organization_id IS NULL ->
-- default org. Migration này incremental, idempotent.

-- ============================================================
-- 1. Add organizations.type + is_default columns
-- ============================================================
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS type VARCHAR(32) NOT NULL DEFAULT 'PARTNER';

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Type enum constraint (PLATFORM | PARTNER | INTERNAL)
ALTER TABLE organizations
    DROP CONSTRAINT IF EXISTS chk_organizations_type;
ALTER TABLE organizations
    ADD CONSTRAINT chk_organizations_type
        CHECK (type IN ('PLATFORM', 'PARTNER', 'INTERNAL'));

-- Partial unique index: chỉ 1 row có is_default = TRUE
CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_default
    ON organizations (is_default) WHERE is_default = TRUE;

-- ============================================================
-- 2. Promote default org seed (Wiii Org -> HoLiLiHu Org PLATFORM)
--
-- V64 seed UUID 'a0000000-0000-0000-0000-000000000001'. Rename name
-- + code, set type=PLATFORM, is_default=TRUE. Idempotent qua WHERE.
-- ============================================================
UPDATE organizations
SET name = 'HoLiLiHu Org',
    code = 'HOLILIHU',
    description = 'Tổ chức nền tảng — vận hành LMS Maritime + người dùng đăng ký cá nhân',
    type = 'PLATFORM',
    is_default = TRUE,
    updated_at = NOW()
WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- ============================================================
-- 3. Backfill any user còn null organization_id sau V64 (idempotent
-- guard cho dữ liệu mới insert giữa V64 -> V119 nếu có)
-- ============================================================
UPDATE users
SET organization_id = 'a0000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- ============================================================
-- 4. Enforce NOT NULL constraint trên users.organization_id
--
-- Sau backfill bước 3, không còn null nào. Nếu vẫn còn (data
-- inconsistency), ALTER sẽ fail và Flyway rollback migration.
-- ============================================================
ALTER TABLE users
    ALTER COLUMN organization_id SET NOT NULL;
