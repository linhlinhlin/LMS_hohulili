package com.example.lms.shared.domain.repository;

import com.example.lms.shared.domain.model.OrgPaymentConfig;

import java.util.Optional;
import java.util.UUID;

public interface OrgPaymentConfigRepository {
    Optional<OrgPaymentConfig> findByOrgId(UUID orgId);
    OrgPaymentConfig save(OrgPaymentConfig config);
}
