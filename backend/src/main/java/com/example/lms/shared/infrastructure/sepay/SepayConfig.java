package com.example.lms.shared.infrastructure.sepay;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * SePay payment gateway configuration.
 *
 * Loaded from:
 *   app.sepay.enabled = true/false
 *   app.sepay.bank-code = MBBank (or BIDV, VCB, etc.)
 *   app.sepay.account-number = your bank account number
 *   app.sepay.account-name = display name on QR (e.g. "LMS MARITIME")
 *   app.sepay.webhook-api-key = secret token SePay sends in Authorization: Apikey
 *   app.sepay.template-code = "compact2" (SePay QR template)
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app.sepay")
public class SepayConfig {

    /** Whether SePay is active. Set false to disable without removing config. */
    private boolean enabled = false;

    /** Bank code as per SePay's supported bank list (e.g. "MBBank", "Vietcombank"). */
    private String bankCode = "";

    /** Merchant bank account number. */
    private String accountNumber = "";

    /** Display name shown on QR (should match account holder name). */
    private String accountName = "";

    /**
     * API key for webhook authentication.
     * SePay sends: Authorization: Apikey {webhookApiKey}
     */
    private String webhookApiKey = "";

    /** QR template code (e.g. "compact2", "compact", "qr_only"). */
    private String templateCode = "compact2";
}
