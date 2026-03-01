package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.OrganizationResponse;
import com.example.lms.identity.domain.model.Organization;
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
        if (orgRepo.existsByCode(code.toUpperCase())) {
            throw new ValidationException("code", "Mã tổ chức đã tồn tại");
        }

        Organization org = Organization.create(name, code, description, tokenExpiryDays);
        Organization saved = orgRepo.save(org);
        log.info("Organization created: id={} code={}", saved.getId(), saved.getCode());
        return OrganizationResponse.from(saved);
    }
}
