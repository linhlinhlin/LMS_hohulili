package com.example.lms.shared.domain.model;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Revenue split configuration for an organisation.
 * <p>
 * orgId == null  →  individual teacher (uses platform-wide admin_settings defaults)
 * orgId != null  →  org-specific override stored in org_payment_configs table
 * <p>
 * org_share_pct = 100 - platformFeePct - teacherSharePct  (always derived, never stored separately)
 */
public class OrgPaymentConfig {

    private final UUID orgId;
    private final BigDecimal platformFeePct;
    private final BigDecimal teacherSharePct;
    private final BigDecimal orgSharePct;     // derived
    private final BigDecimal minPayoutAmount;

    private OrgPaymentConfig(UUID orgId,
                              BigDecimal platformFeePct,
                              BigDecimal teacherSharePct,
                              BigDecimal minPayoutAmount) {
        BigDecimal sum = platformFeePct.add(teacherSharePct);
        if (sum.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException(
                "platformFeePct + teacherSharePct must not exceed 100, got: " + sum);
        }
        this.orgId           = orgId;
        this.platformFeePct  = platformFeePct;
        this.teacherSharePct = teacherSharePct;
        this.orgSharePct     = BigDecimal.valueOf(100).subtract(sum);
        this.minPayoutAmount = minPayoutAmount;
    }

    /** Platform-wide defaults for individual (null-org) teachers. */
    public static OrgPaymentConfig platformDefault() {
        return new OrgPaymentConfig(null,
                BigDecimal.valueOf(20),
                BigDecimal.valueOf(70),
                BigDecimal.valueOf(100_000));
    }

    public static OrgPaymentConfig create(UUID orgId,
                                           BigDecimal platformFeePct,
                                           BigDecimal teacherSharePct,
                                           BigDecimal minPayoutAmount) {
        return new OrgPaymentConfig(orgId, platformFeePct, teacherSharePct, minPayoutAmount);
    }

    public OrgPaymentConfig update(BigDecimal platformFeePct,
                                    BigDecimal teacherSharePct,
                                    BigDecimal minPayoutAmount) {
        return new OrgPaymentConfig(this.orgId, platformFeePct, teacherSharePct, minPayoutAmount);
    }

    public UUID getOrgId()            { return orgId; }
    public BigDecimal getPlatformFeePct()  { return platformFeePct; }
    public BigDecimal getTeacherSharePct() { return teacherSharePct; }
    public BigDecimal getOrgSharePct()     { return orgSharePct; }
    public BigDecimal getMinPayoutAmount() { return minPayoutAmount; }
}
