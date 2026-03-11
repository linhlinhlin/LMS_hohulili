-- V79: Admin settings persistence (key-value store)
-- Follows Moodle mdl_config / WordPress wp_options pattern

CREATE TABLE IF NOT EXISTS admin_settings (
    setting_key     VARCHAR(100)    PRIMARY KEY,
    setting_value   TEXT            NOT NULL,
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

-- Seed defaults
INSERT INTO admin_settings (setting_key, setting_value) VALUES
    ('general', '{"siteName":"Maritime LMS","siteDescription":"He thong quan ly hoc tap hang hai","maintenanceMode":false,"allowRegistration":true,"requireEmailVerification":false}'),
    ('email', '{"smtpHost":"smtp.gmail.com","smtpPort":587,"smtpUser":"","smtpPassword":"","fromEmail":"noreply@maritime.edu","fromName":"Maritime LMS"}'),
    ('payment', '{"stripePublicKey":"","stripeSecretKey":"","paypalClientId":"","paypalClientSecret":"","currency":"VND"}'),
    ('security', '{"sessionTimeout":1440,"maxLoginAttempts":5,"passwordMinLength":8,"requireTwoFactor":false}')
ON CONFLICT (setting_key) DO NOTHING;
