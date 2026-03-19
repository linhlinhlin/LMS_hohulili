package com.example.lms.shared.application.usecase;

import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.shared.application.port.RevenueConfigPort;
import com.example.lms.shared.domain.model.OrgPaymentConfig;
import com.example.lms.shared.domain.repository.OrgPaymentConfigRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ManageOrgPaymentConfigUseCase {

    private final OrganizationRepository orgRepo;
    private final OrgPaymentConfigRepository configRepo;
    private final RevenueConfigPort          revenueConfigPort;

    @Transactional(readOnly = true)
    public OrgPaymentConfig getConfig(UUID orgId) {
        ensureOrganizationExists(orgId);
        // Returns org-specific config or platform default
        return revenueConfigPort.resolveConfig(orgId);
    }

    @Transactional
    public OrgPaymentConfig upsertConfig(UUID orgId, BigDecimal platformFeePct,
                                          BigDecimal teacherSharePct, BigDecimal minPayoutAmount) {
        ensureOrganizationExists(orgId);
        // Validate sum (OrgPaymentConfig constructor also validates, but be explicit)
        BigDecimal sum = platformFeePct.add(teacherSharePct);
        if (sum.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException(
                    "platformFeePct + teacherSharePct không được vượt quá 100%, hiện tại: " + sum);
        }
        var config = configRepo.findByOrgId(orgId)
                .map(existing -> existing.update(platformFeePct, teacherSharePct, minPayoutAmount))
                .orElse(OrgPaymentConfig.create(orgId, platformFeePct, teacherSharePct, minPayoutAmount));
        return configRepo.save(config);
    }

    private void ensureOrganizationExists(UUID orgId) {
        orgRepo.findById(orgId)
                .orElseThrow(() -> new EntityNotFoundException("Tổ chức", orgId));
    }
}
