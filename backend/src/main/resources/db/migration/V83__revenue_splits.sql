-- V83: Immutable revenue split ledger — one record per completed payment
-- NEVER UPDATE rows in this table. It is an append-only audit trail.

CREATE TABLE revenue_splits (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id          UUID        NOT NULL UNIQUE
                                    REFERENCES payment_transactions(id),
    course_id           UUID        NOT NULL,   -- denormalized for query convenience
    teacher_id          UUID        NOT NULL REFERENCES users(id),
    org_id              UUID        REFERENCES organizations(id), -- NULL = individual/default org

    gross_amount        NUMERIC(19,2) NOT NULL,

    -- Snapshot of config percentages at the time of payment (immutable)
    platform_fee_pct    NUMERIC(5,2) NOT NULL,
    teacher_share_pct   NUMERIC(5,2) NOT NULL,
    org_share_pct       NUMERIC(5,2) NOT NULL,

    -- Computed amounts (teacher_amount = gross - platform - org, avoids rounding drift)
    platform_amount     NUMERIC(19,2) NOT NULL,
    teacher_amount      NUMERIC(19,2) NOT NULL,
    org_amount          NUMERIC(19,2) NOT NULL DEFAULT 0,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE revenue_splits IS
    'Append-only revenue split ledger. One row per completed payment_transaction.';
COMMENT ON COLUMN revenue_splits.teacher_amount IS
    'Computed as gross - platform_amount - org_amount to avoid cumulative rounding error.';

CREATE INDEX idx_revenue_splits_teacher
    ON revenue_splits(teacher_id, created_at DESC);
CREATE INDEX idx_revenue_splits_org
    ON revenue_splits(org_id, created_at DESC);
CREATE INDEX idx_revenue_splits_created
    ON revenue_splits(created_at DESC);
