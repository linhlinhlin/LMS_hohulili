-- V86: Force re-enable SePay (fix from broken admin settings save overwriting flags)
-- Sets sepayEnabled=true and ensures vnpayEnabled=false as intended defaults.

UPDATE admin_settings
SET setting_value = (
    setting_value::jsonb
    || '{"sepayEnabled":true,"vnpayEnabled":false}'::jsonb
)::text,
    updated_at = NOW()
WHERE setting_key = 'payment';
