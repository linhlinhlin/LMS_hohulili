package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.OrganizationResponse;
import com.example.lms.identity.domain.model.OrganizationType;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ListOrganizationsUseCase {

    private final OrganizationRepository orgRepo;

    @Transactional(readOnly = true)
    public List<OrganizationResponse> execute() {
        return execute(null);
    }

    /**
     * Issue #254 (Phase 4): optional type filter. Invalid/blank → no filter
     * (return all). Filter ở memory level vì repo không expose findByType yet
     * — list size hiện tại nhỏ (< 100 orgs typical), chấp nhận trade-off.
     */
    @Transactional(readOnly = true)
    public List<OrganizationResponse> execute(String typeFilter) {
        OrganizationType filter = parseType(typeFilter);
        var stream = orgRepo.findAll().stream();
        if (filter != null) {
            stream = stream.filter(org -> org.getType() == filter);
        }
        return stream.map(OrganizationResponse::from).toList();
    }

    private OrganizationType parseType(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return OrganizationType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            log.warn("Invalid type filter '{}', ignoring filter", raw);
            return null;
        }
    }
}
