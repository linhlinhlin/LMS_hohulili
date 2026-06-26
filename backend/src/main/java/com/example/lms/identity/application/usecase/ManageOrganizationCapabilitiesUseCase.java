package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.OrganizationCapabilityResponse;
import com.example.lms.identity.domain.model.OrganizationCapability;
import com.example.lms.identity.domain.repository.OrganizationCapabilityRepository;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ManageOrganizationCapabilitiesUseCase {
    private final OrganizationRepository organizationRepository;
    private final OrganizationCapabilityRepository capabilityRepository;

    public List<OrganizationCapabilityResponse> list(UUID organizationId) {
        ensureOrganizationExists(organizationId);
        return capabilityRepository.findByOrganizationId(organizationId).stream()
                .sorted(Comparator.comparing(OrganizationCapability::getKey))
                .map(OrganizationCapabilityResponse::from)
                .toList();
    }

    public OrganizationCapabilityResponse setEnabled(UUID organizationId, String rawKey, boolean enabled) {
        ensureOrganizationExists(organizationId);
        String key = OrganizationCapability.normalizeKey(rawKey);
        OrganizationCapability capability = capabilityRepository.findByOrganizationIdAndKey(organizationId, key)
                .orElseGet(() -> OrganizationCapability.create(organizationId, key, enabled));
        capability.setEnabled(enabled);
        return OrganizationCapabilityResponse.from(capabilityRepository.save(capability));
    }

    private void ensureOrganizationExists(UUID organizationId) {
        if (organizationRepository.findById(organizationId).isEmpty()) {
            throw new EntityNotFoundException("Organization", organizationId);
        }
    }
}
