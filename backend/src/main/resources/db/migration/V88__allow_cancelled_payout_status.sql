-- V88: allow soft-cancelled payout requests in audit trail

ALTER TABLE payout_requests
    DROP CONSTRAINT IF EXISTS payout_requests_status_check;

ALTER TABLE payout_requests
    ADD CONSTRAINT payout_requests_status_check
        CHECK (status IN ('PENDING','APPROVED','REJECTED','COMPLETED','CANCELLED'));
