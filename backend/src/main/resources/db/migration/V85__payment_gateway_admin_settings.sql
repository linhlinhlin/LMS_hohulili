-- V85: Add vnpayEnabled / sepayEnabled flags to admin payment settings
-- Strategy: merge defaults into existing row (existing values win), insert if missing.
-- Default: SePay enabled, VNPay disabled.

UPDATE admin_settings
SET setting_value = (
    '{"vnpayEnabled":false,"sepayEnabled":true}'::jsonb
    || COALESCE(setting_value::jsonb, '{}'::jsonb)
)::text,
    updated_at = NOW()
WHERE setting_key = 'payment';

INSERT INTO admin_settings (setting_key, setting_value, updated_at)
VALUES (
    'payment',
    '{"stripePublicKey":"","stripeSecretKey":"","paypalClientId":"","paypalClientSecret":"","currency":"VND","vnpayEnabled":false,"sepayEnabled":true}',
    NOW()
)
ON CONFLICT (setting_key) DO NOTHING;
