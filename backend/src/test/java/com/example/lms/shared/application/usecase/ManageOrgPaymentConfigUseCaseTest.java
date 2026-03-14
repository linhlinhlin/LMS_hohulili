package com.example.lms.shared.application.usecase;

import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.shared.domain.repository.OrgPaymentConfigRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.infrastructure.service.RevenueConfigService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ManageOrgPaymentConfigUseCaseTest {

    @Mock private OrganizationRepository orgRepo;
    @Mock private OrgPaymentConfigRepository configRepo;
    @Mock private RevenueConfigService revenueConfigService;

    @InjectMocks
    private ManageOrgPaymentConfigUseCase useCase;

    @Test
    @DisplayName("getConfig throws when organization does not exist")
    void getConfigThrowsWhenOrganizationMissing() {
        UUID orgId = UUID.randomUUID();
        when(orgRepo.findById(orgId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.getConfig(orgId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining(orgId.toString());
        verify(revenueConfigService, never()).resolveConfig(orgId);
    }

    @Test
    @DisplayName("upsertConfig throws when organization does not exist")
    void upsertConfigThrowsWhenOrganizationMissing() {
        UUID orgId = UUID.randomUUID();
        when(orgRepo.findById(orgId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.upsertConfig(
                orgId,
                BigDecimal.valueOf(10),
                BigDecimal.valueOf(80),
                BigDecimal.valueOf(100000)))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining(orgId.toString());
        verify(configRepo, never()).save(org.mockito.Mockito.any());
    }
}
