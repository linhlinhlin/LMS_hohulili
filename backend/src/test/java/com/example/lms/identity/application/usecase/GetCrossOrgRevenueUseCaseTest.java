package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.model.OrganizationType;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.shared.application.port.LearningPackageRevenuePort;
import com.example.lms.shared.domain.model.OrgRevenueAggregate;
import com.example.lms.shared.domain.repository.RevenueSplitRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("GetCrossOrgRevenueUseCase Tests")
class GetCrossOrgRevenueUseCaseTest {

    @Mock private RevenueSplitRepository revenueRepo;
    @Mock private LearningPackageRevenuePort learningPackageRevenuePort;
    @Mock private OrganizationRepository orgRepo;

    @InjectMocks
    private GetCrossOrgRevenueUseCase useCase;

    @Test
    @DisplayName("execute should merge course and learning package revenue by organization")
    void executeShouldMergeCourseAndLearningPackageRevenueByOrganization() {
        UUID vmuOrgId = UUID.randomUUID();
        UUID partnerOrgId = UUID.randomUUID();

        when(revenueRepo.sumGrossRevenueAll()).thenReturn(BigDecimal.valueOf(1000000));
        when(learningPackageRevenuePort.sumGrossRevenueAll()).thenReturn(BigDecimal.valueOf(500000));
        when(revenueRepo.sumPlatformAmountAll()).thenReturn(BigDecimal.valueOf(200000));
        when(learningPackageRevenuePort.sumPlatformAmountAll()).thenReturn(BigDecimal.valueOf(100000));
        when(revenueRepo.sumTeacherAmountAll()).thenReturn(BigDecimal.valueOf(700000));
        when(learningPackageRevenuePort.sumTeacherAmountAll()).thenReturn(BigDecimal.valueOf(350000));
        when(revenueRepo.sumOrgAmountAll()).thenReturn(BigDecimal.valueOf(100000));
        when(learningPackageRevenuePort.sumOrgAmountAll()).thenReturn(BigDecimal.valueOf(50000));

        when(revenueRepo.findTopOrgsByRevenue(5))
                .thenReturn(List.of(new OrgRevenueAggregate(vmuOrgId, BigDecimal.valueOf(1000000))));
        when(learningPackageRevenuePort.findTopOrgsByRevenue(5))
                .thenReturn(List.of(
                        new OrgRevenueAggregate(vmuOrgId, BigDecimal.valueOf(500000)),
                        new OrgRevenueAggregate(partnerOrgId, BigDecimal.valueOf(700000))
                ));
        when(orgRepo.findById(vmuOrgId)).thenReturn(Optional.of(org(vmuOrgId, "VMU", "Vietnam Maritime University")));
        when(orgRepo.findById(partnerOrgId)).thenReturn(Optional.of(org(partnerOrgId, "PARTNER", "Partner Academy")));

        var response = useCase.execute();

        assertThat(response.totalGrossRevenue()).isEqualByComparingTo(BigDecimal.valueOf(1500000));
        assertThat(response.totalPlatformFees()).isEqualByComparingTo(BigDecimal.valueOf(300000));
        assertThat(response.totalTeacherPayouts()).isEqualByComparingTo(BigDecimal.valueOf(1050000));
        assertThat(response.totalOrgPayouts()).isEqualByComparingTo(BigDecimal.valueOf(150000));
        assertThat(response.topOrgs()).hasSize(2);
        assertThat(response.topOrgs().get(0).orgId()).isEqualTo(vmuOrgId);
        assertThat(response.topOrgs().get(0).totalRevenue()).isEqualByComparingTo(BigDecimal.valueOf(1500000));
        assertThat(response.topOrgs().get(1).orgId()).isEqualTo(partnerOrgId);
        assertThat(response.topOrgs().get(1).totalRevenue()).isEqualByComparingTo(BigDecimal.valueOf(700000));
    }

    private Organization org(UUID id, String code, String name) {
        return new Organization(
                id,
                name,
                code,
                null,
                true,
                30,
                OrganizationType.PARTNER,
                false,
                Instant.now(),
                null
        );
    }
}
