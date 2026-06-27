-- V158: Add explicit refund state for organization-scoped learning package payments.
--
-- Revenue split rows remain append-only for audit. Aggregation queries count only
-- ACTIVE package enrollments so refunded package payments no longer inflate payout.

ALTER TABLE learning_package_enrollments
    DROP CONSTRAINT IF EXISTS chk_learning_package_enrollments_status;

ALTER TABLE learning_package_enrollments
    ADD CONSTRAINT chk_learning_package_enrollments_status CHECK (status IN (
        'PENDING_APPROVAL',
        'PENDING_PAYMENT',
        'ACTIVE',
        'REJECTED',
        'CANCELLED',
        'REFUNDED'
    ));

ALTER TABLE learning_package_payment_events
    DROP CONSTRAINT IF EXISTS chk_learning_package_payment_events_type;

ALTER TABLE learning_package_payment_events
    ADD CONSTRAINT chk_learning_package_payment_events_type
        CHECK (event_type IN ('QR_CREATED', 'PAYMENT_CONFIRMED', 'REFUNDED'));

COMMENT ON COLUMN learning_package_enrollments.status IS
    'PENDING_APPROVAL, PENDING_PAYMENT, ACTIVE, REJECTED, CANCELLED, or REFUNDED.';
