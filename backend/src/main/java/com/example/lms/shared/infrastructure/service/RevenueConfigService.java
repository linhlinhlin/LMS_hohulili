package com.example.lms.shared.infrastructure.service;

import com.example.lms.shared.application.port.AdminSettingsPort;
import com.example.lms.shared.domain.model.OrgPaymentConfig;
import com.example.lms.shared.domain.repository.OrgPaymentConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Resolves the effective OrgPaymentConfig for a given orgId.
 * <p>
 * Resolution order:
 *  1. org_payment_configs table (per-org override)
 *  2. admin_settings table (platform-wide defaults, keys: revenue.*)
 *  3. Hard-coded fallback: platform=20%, teacher=70%, min=100,000đ
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RevenueConfigService {

    private final OrgPaymentConfigRepository orgConfigRepo;
    private final AdminSettingsPort          adminSettings;

    /**
     * @param orgId  the teacher's organisation ID, or {@code null} for individual teachers
     */
    public OrgPaymentConfig resolveConfig(UUID orgId) {
        // 1. Org-specific override
        if (orgId != null) {
            var orgConfig = orgConfigRepo.findByOrgId(orgId);
            if (orgConfig.isPresent()) {
                return orgConfig.get();
            }
        }

        // 2. Platform defaults from admin_settings
        try {
            BigDecimal platformPct = adminSettings.load("revenue.platform_fee_pct")
                    .map(BigDecimal::new).orElse(BigDecimal.valueOf(20));
            BigDecimal teacherPct  = adminSettings.load("revenue.teacher_share_pct")
                    .map(BigDecimal::new).orElse(BigDecimal.valueOf(70));
            BigDecimal minPayout   = adminSettings.load("revenue.min_payout_amount")
                    .map(BigDecimal::new).orElse(BigDecimal.valueOf(100_000));
            return OrgPaymentConfig.create(null, platformPct, teacherPct, minPayout);
        } catch (Exception e) {
            log.warn("[Revenue] Failed to read admin_settings defaults, using hard-coded fallback", e);
        }

        // 3. Hard-coded fallback
        return OrgPaymentConfig.platformDefault();
    }
}
