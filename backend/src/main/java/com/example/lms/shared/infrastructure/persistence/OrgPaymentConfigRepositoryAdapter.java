package com.example.lms.shared.infrastructure.persistence;

import com.example.lms.shared.domain.model.OrgPaymentConfig;
import com.example.lms.shared.domain.repository.OrgPaymentConfigRepository;
import com.example.lms.shared.infrastructure.persistence.entity.OrgPaymentConfigJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.OrgPaymentConfigJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OrgPaymentConfigRepositoryAdapter implements OrgPaymentConfigRepository {

    private final OrgPaymentConfigJpaRepository jpaRepo;

    @Override
    public Optional<OrgPaymentConfig> findByOrgId(UUID orgId) {
        return jpaRepo.findById(orgId).map(this::toDomain);
    }

    @Override
    public OrgPaymentConfig save(OrgPaymentConfig config) {
        var entity = OrgPaymentConfigJpaEntity.builder()
                .orgId(config.getOrgId())
                .platformFeePct(config.getPlatformFeePct())
                .teacherSharePct(config.getTeacherSharePct())
                .minPayoutAmount(config.getMinPayoutAmount())
                .build();
        var saved = jpaRepo.save(entity);
        return toDomain(saved);
    }

    private OrgPaymentConfig toDomain(OrgPaymentConfigJpaEntity e) {
        return OrgPaymentConfig.create(e.getOrgId(), e.getPlatformFeePct(),
                e.getTeacherSharePct(), e.getMinPayoutAmount());
    }
}
