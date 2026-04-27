package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.OrganizationResponse;
import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.model.OrganizationType;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Issue #254 (Phase 4 PR 1): contract test cho ListOrganizationsUseCase
 * type filter overload. No filter → all. Valid type → filtered. Invalid →
 * tolerant (no filter, return all).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ListOrganizationsUseCase Tests")
class ListOrganizationsUseCaseTest {

    @Mock
    private OrganizationRepository orgRepo;

    @InjectMocks
    private ListOrganizationsUseCase useCase;

    private Organization platformOrg() {
        return new Organization(UUID.randomUUID(), "HoLiLiHu", "HOLILIHU", null, true, 30,
                OrganizationType.PLATFORM, true, Instant.now(), null);
    }

    private Organization partnerOrg(String code) {
        return new Organization(UUID.randomUUID(), code, code, null, true, 30,
                OrganizationType.PARTNER, false, Instant.now(), null);
    }

    private Organization internalOrg(String code) {
        return new Organization(UUID.randomUUID(), code, code, null, true, 30,
                OrganizationType.INTERNAL, false, Instant.now(), null);
    }

    @Test
    @DisplayName("execute() không filter → trả tất cả org")
    void shouldReturnAllWhenNoFilter() {
        when(orgRepo.findAll()).thenReturn(List.of(platformOrg(), partnerOrg("P1"), internalOrg("I1")));

        List<OrganizationResponse> result = useCase.execute();

        assertThat(result).hasSize(3);
    }

    @Test
    @DisplayName("execute('PARTNER') → chỉ trả PARTNER orgs")
    void shouldFilterByPartner() {
        when(orgRepo.findAll()).thenReturn(List.of(
                platformOrg(), partnerOrg("P1"), partnerOrg("P2"), internalOrg("I1")));

        List<OrganizationResponse> result = useCase.execute("PARTNER");

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(r -> r.type() == OrganizationType.PARTNER);
    }

    @Test
    @DisplayName("execute('PLATFORM') → chỉ trả PLATFORM org (HoLiLiHu)")
    void shouldFilterByPlatform() {
        when(orgRepo.findAll()).thenReturn(List.of(
                platformOrg(), partnerOrg("P1"), internalOrg("I1")));

        List<OrganizationResponse> result = useCase.execute("PLATFORM");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).type()).isEqualTo(OrganizationType.PLATFORM);
    }

    @Test
    @DisplayName("execute('INVALID_TYPE') → tolerant, trả tất cả (không filter)")
    void shouldReturnAllWhenInvalidFilter() {
        when(orgRepo.findAll()).thenReturn(List.of(platformOrg(), partnerOrg("P1")));

        List<OrganizationResponse> result = useCase.execute("INVALID_GIBBERISH");

        assertThat(result).hasSize(2);
    }

    @Test
    @DisplayName("execute(null) → trả tất cả")
    void shouldReturnAllWhenFilterNull() {
        when(orgRepo.findAll()).thenReturn(List.of(platformOrg(), partnerOrg("P1")));

        List<OrganizationResponse> result = useCase.execute((String) null);

        assertThat(result).hasSize(2);
    }

    @Test
    @DisplayName("execute('  partner  ') → case-insensitive + trim")
    void shouldFilterCaseInsensitive() {
        when(orgRepo.findAll()).thenReturn(List.of(partnerOrg("P1"), internalOrg("I1")));

        List<OrganizationResponse> result = useCase.execute("  partner  ");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).type()).isEqualTo(OrganizationType.PARTNER);
    }
}
