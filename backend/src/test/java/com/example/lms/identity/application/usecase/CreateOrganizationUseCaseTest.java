package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.OrganizationResponse;
import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.model.OrganizationType;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.shared.exception.ValidationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Issue #254 (Phase 4 PR 1): contract test cho CreateOrganizationUseCase
 * type-aware overload. Verify PARTNER/INTERNAL accept, PLATFORM reject,
 * fallback PARTNER cho null/invalid type.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("CreateOrganizationUseCase Tests")
class CreateOrganizationUseCaseTest {

    @Mock
    private OrganizationRepository orgRepo;

    @InjectMocks
    private CreateOrganizationUseCase useCase;

    @Captor
    private ArgumentCaptor<Organization> orgCaptor;

    @Test
    @DisplayName("Tạo org với type=PARTNER → lưu PARTNER")
    void shouldCreatePartnerOrg() {
        when(orgRepo.existsByCode(anyString())).thenReturn(false);
        when(orgRepo.save(any(Organization.class))).thenAnswer(inv -> inv.getArgument(0));

        OrganizationResponse response = useCase.execute("Đối tác A", "PARTNERA", "desc", 30, "PARTNER");

        verify(orgRepo).save(orgCaptor.capture());
        assertThat(orgCaptor.getValue().getType()).isEqualTo(OrganizationType.PARTNER);
        assertThat(response.code()).isEqualTo("PARTNERA");
    }

    @Test
    @DisplayName("Tạo org với type=INTERNAL → lưu INTERNAL")
    void shouldCreateInternalOrg() {
        when(orgRepo.existsByCode(anyString())).thenReturn(false);
        when(orgRepo.save(any(Organization.class))).thenAnswer(inv -> inv.getArgument(0));

        useCase.execute("Phòng đào tạo", "INTERNAL1", "desc", 30, "INTERNAL");

        verify(orgRepo).save(orgCaptor.capture());
        assertThat(orgCaptor.getValue().getType()).isEqualTo(OrganizationType.INTERNAL);
    }

    @Test
    @DisplayName("Tạo org với type=PLATFORM → ném ValidationException (V119 partial unique)")
    void shouldRejectPlatformType() {
        when(orgRepo.existsByCode(anyString())).thenReturn(false);

        assertThatThrownBy(() -> useCase.execute("Sham platform", "FAKE", "desc", 30, "PLATFORM"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("PLATFORM");

        verify(orgRepo, never()).save(any());
    }

    @Test
    @DisplayName("Tạo org với type=null → fallback PARTNER")
    void shouldFallbackPartnerWhenTypeNull() {
        when(orgRepo.existsByCode(anyString())).thenReturn(false);
        when(orgRepo.save(any(Organization.class))).thenAnswer(inv -> inv.getArgument(0));

        useCase.execute("Default org", "DEFAULT1", "desc", 30, null);

        verify(orgRepo).save(orgCaptor.capture());
        assertThat(orgCaptor.getValue().getType()).isEqualTo(OrganizationType.PARTNER);
    }

    @Test
    @DisplayName("Tạo org với type='UNKNOWN' → fallback PARTNER (tolerant)")
    void shouldFallbackPartnerWhenTypeInvalid() {
        when(orgRepo.existsByCode(anyString())).thenReturn(false);
        when(orgRepo.save(any(Organization.class))).thenAnswer(inv -> inv.getArgument(0));

        useCase.execute("Bad type", "BAD1", "desc", 30, "UNKNOWN_GIBBERISH");

        verify(orgRepo).save(orgCaptor.capture());
        assertThat(orgCaptor.getValue().getType()).isEqualTo(OrganizationType.PARTNER);
    }

    @Test
    @DisplayName("Backward-compat 4-arg overload → fallback PARTNER")
    void shouldFallbackPartnerOnLegacyOverload() {
        when(orgRepo.existsByCode(anyString())).thenReturn(false);
        when(orgRepo.save(any(Organization.class))).thenAnswer(inv -> inv.getArgument(0));

        useCase.execute("Legacy call", "LEGACY1", "desc", 30);

        verify(orgRepo).save(orgCaptor.capture());
        assertThat(orgCaptor.getValue().getType()).isEqualTo(OrganizationType.PARTNER);
    }

    @Test
    @DisplayName("Code đã tồn tại → ném ValidationException")
    void shouldRejectDuplicateCode() {
        when(orgRepo.existsByCode("DUPE")).thenReturn(true);

        assertThatThrownBy(() -> useCase.execute("Dupe org", "DUPE", "desc", 30, "PARTNER"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("đã tồn tại");

        verify(orgRepo, never()).save(any());
    }
}
