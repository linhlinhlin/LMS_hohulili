package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.model.OrganizationCapability;
import com.example.lms.identity.domain.repository.OrganizationCapabilityRepository;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ManageOrganizationCapabilitiesUseCase Tests")
class ManageOrganizationCapabilitiesUseCaseTest {
    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private OrganizationCapabilityRepository capabilityRepository;

    @InjectMocks
    private ManageOrganizationCapabilitiesUseCase useCase;

    @Captor
    private ArgumentCaptor<OrganizationCapability> capabilityCaptor;

    @Test
    @DisplayName("list: returns capabilities sorted by key")
    void list_returnsCapabilitiesSortedByKey() {
        UUID orgId = UUID.randomUUID();
        when(organizationRepository.findById(orgId)).thenReturn(Optional.of(org(orgId)));
        when(capabilityRepository.findByOrganizationId(orgId)).thenReturn(List.of(
                capability(orgId, "learning_packages", true),
                capability(orgId, "academic_catalog", true)
        ));

        var response = useCase.list(orgId);

        assertThat(response).extracting("key")
                .containsExactly("academic_catalog", "learning_packages");
    }

    @Test
    @DisplayName("setEnabled: creates capability when key is missing")
    void setEnabled_createsCapabilityWhenMissing() {
        UUID orgId = UUID.randomUUID();
        when(organizationRepository.findById(orgId)).thenReturn(Optional.of(org(orgId)));
        when(capabilityRepository.findByOrganizationIdAndKey(orgId, "learning_packages"))
                .thenReturn(Optional.empty());
        when(capabilityRepository.save(any(OrganizationCapability.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = useCase.setEnabled(orgId, " learning_packages ", true);

        verify(capabilityRepository).save(capabilityCaptor.capture());
        assertThat(capabilityCaptor.getValue().getOrganizationId()).isEqualTo(orgId);
        assertThat(capabilityCaptor.getValue().getKey()).isEqualTo("learning_packages");
        assertThat(capabilityCaptor.getValue().isEnabled()).isTrue();
        assertThat(response.key()).isEqualTo("learning_packages");
    }

    @Test
    @DisplayName("setEnabled: updates existing capability")
    void setEnabled_updatesExistingCapability() {
        UUID orgId = UUID.randomUUID();
        OrganizationCapability existing = capability(orgId, "org_payment_config", true);
        when(organizationRepository.findById(orgId)).thenReturn(Optional.of(org(orgId)));
        when(capabilityRepository.findByOrganizationIdAndKey(orgId, "org_payment_config"))
                .thenReturn(Optional.of(existing));
        when(capabilityRepository.save(existing)).thenReturn(existing);

        var response = useCase.setEnabled(orgId, "org_payment_config", false);

        assertThat(existing.isEnabled()).isFalse();
        assertThat(response.enabled()).isFalse();
    }

    @Test
    @DisplayName("setEnabled: rejects invalid capability key")
    void setEnabled_rejectsInvalidKey() {
        UUID orgId = UUID.randomUUID();
        when(organizationRepository.findById(orgId)).thenReturn(Optional.of(org(orgId)));

        assertThatThrownBy(() -> useCase.setEnabled(orgId, "Bad Key", true))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Capability key");

        verify(capabilityRepository, never()).save(any());
    }

    @Test
    @DisplayName("list: rejects missing organization")
    void list_rejectsMissingOrganization() {
        UUID orgId = UUID.randomUUID();
        when(organizationRepository.findById(orgId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.list(orgId))
                .isInstanceOf(EntityNotFoundException.class);

        verify(capabilityRepository, never()).findByOrganizationId(any());
    }

    private Organization org(UUID id) {
        return new Organization(id, "VMU", "VMU", null, true, 30, Instant.now(), null);
    }

    private OrganizationCapability capability(UUID orgId, String key, boolean enabled) {
        return new OrganizationCapability(UUID.randomUUID(), orgId, key, enabled, Instant.now(), null);
    }
}
