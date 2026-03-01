-- V64: Organizations + Organization Invites
-- Creates the organization system with invite-based membership

-- ============================================================
-- 1. Organizations table
-- ============================================================
CREATE TABLE organizations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255) NOT NULL,
    code              VARCHAR(50) UNIQUE NOT NULL,
    description       TEXT,
    enabled           BOOLEAN NOT NULL DEFAULT TRUE,
    token_expiry_days INT NOT NULL DEFAULT 30,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_organizations_code ON organizations(code);

-- ============================================================
-- 2. Add organization_id to users
-- ============================================================
ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_users_organization_id ON users(organization_id);

-- ============================================================
-- 3. Organization Invites table
-- ============================================================
CREATE TABLE organization_invites (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type              VARCHAR(20) NOT NULL,
    code              VARCHAR(12) UNIQUE,
    email             VARCHAR(255),
    token_hash        VARCHAR(128),
    max_uses          INT,
    use_count         INT NOT NULL DEFAULT 0,
    status            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    expires_at        TIMESTAMPTZ NOT NULL,
    created_by        UUID NOT NULL REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version           INT NOT NULL DEFAULT 0,

    CONSTRAINT chk_invite_type CHECK (type IN ('CODE', 'EMAIL')),
    CONSTRAINT chk_invite_status CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
    CONSTRAINT chk_code_required CHECK (type != 'CODE' OR code IS NOT NULL),
    CONSTRAINT chk_email_required CHECK (type != 'EMAIL' OR (email IS NOT NULL AND token_hash IS NOT NULL))
);

CREATE INDEX idx_org_invites_code ON organization_invites(code) WHERE status = 'ACTIVE';
CREATE INDEX idx_org_invites_token ON organization_invites(token_hash) WHERE status = 'ACTIVE';
CREATE INDEX idx_org_invites_org_id ON organization_invites(organization_id);
CREATE INDEX idx_org_invites_expires ON organization_invites(expires_at) WHERE status = 'ACTIVE';

-- ============================================================
-- 4. Seed default "Wiii Org" for individual registrations
-- ============================================================
INSERT INTO organizations (id, name, code, description, enabled, token_expiry_days)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Wiii Org',
    'WIII',
    'Tổ chức mặc định cho người dùng đăng ký cá nhân',
    TRUE,
    30
) ON CONFLICT (code) DO NOTHING;

-- Assign existing users without org to default Wiii Org
UPDATE users SET organization_id = 'a0000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;
