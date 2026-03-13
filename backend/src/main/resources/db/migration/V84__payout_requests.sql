-- V84: Teacher payout (withdrawal) requests

CREATE TABLE payout_requests (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id      UUID        NOT NULL REFERENCES users(id),
    bank_account_id UUID        NOT NULL REFERENCES teacher_bank_accounts(id),
    amount          NUMERIC(19,2) NOT NULL CHECK (amount > 0),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','APPROVED','REJECTED','COMPLETED')),
    teacher_note    TEXT,
    admin_note      TEXT,
    processed_by    UUID        REFERENCES users(id),
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ
);

CREATE INDEX idx_payout_requests_teacher
    ON payout_requests(teacher_id, status, requested_at DESC);
CREATE INDEX idx_payout_requests_status
    ON payout_requests(status, requested_at DESC);
