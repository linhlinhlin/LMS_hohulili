package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.OrganizationResponse;
import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.model.OrganizationType;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CreateOrganizationUseCase {

    private final OrganizationRepository orgRepo;

    @Transactional
    public OrganizationResponse execute(String name, String code, String description, int tokenExpiryDays) {
        return execute(name, code, description, tokenExpiryDays, null);
    }

    /**
     * Issue #254 (Phase 4): create với type field optional. PLATFORM bị reject
     * — V119 partial unique constraint chỉ cho phép 1 PLATFORM (HoLiLiHu Org).
     * Null/empty/invalid → fallback PARTNER (consistent OrganizationEntityMapper).
     */
    @Transactional
    public OrganizationResponse execute(String name, String code, String description,
                                        int tokenExpiryDays, String typeRaw) {
        if (orgRepo.existsByCode(code.toUpperCase())) {
            throw new ValidationException("code", "Mã tổ chức đã tồn tại");
        }

        OrganizationType type = parseType(typeRaw);
        if (type == OrganizationType.PLATFORM) {
            throw new ValidationException("type",
                "Không thể tạo tổ chức loại PLATFORM — chỉ tổ chức nền tảng mặc định (HoLiLiHu Org) được phép.");
        }

        Organization org = Organization.create(name, code, description, tokenExpiryDays, type);
        Organization saved = orgRepo.save(org);
        log.info("Organization created: id={} code={} type={}", saved.getId(), saved.getCode(), saved.getType());
        return OrganizationResponse.from(saved);
    }

    private OrganizationType parseType(String raw) {
        if (raw == null || raw.isBlank()) return OrganizationType.PARTNER;
        try {
            return OrganizationType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            log.warn("Invalid organization type '{}', fallback PARTNER", raw);
            return OrganizationType.PARTNER;
        }
    }
}
