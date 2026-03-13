-- V82: Teacher bank accounts for payout transfers

CREATE TABLE teacher_bank_accounts (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_code       VARCHAR(20) NOT NULL,       -- e.g. MBBank, VCB, TCB, VTB
    account_number  VARCHAR(30) NOT NULL,
    account_name    VARCHAR(100) NOT NULL,
    is_default      BOOLEAN     NOT NULL DEFAULT FALSE,
    verified        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_teacher_bank_account UNIQUE (teacher_id, bank_code, account_number)
);

CREATE INDEX idx_teacher_bank_accounts_teacher
    ON teacher_bank_accounts(teacher_id);

-- Only one default account per teacher (partial unique index)
CREATE UNIQUE INDEX idx_teacher_bank_accounts_default
    ON teacher_bank_accounts(teacher_id)
    WHERE is_default = TRUE;
