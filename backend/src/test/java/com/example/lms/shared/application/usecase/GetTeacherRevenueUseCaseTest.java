package com.example.lms.shared.application.usecase;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.application.port.LearningPackageRevenuePort;
import com.example.lms.shared.domain.model.OrgPaymentConfig;
import com.example.lms.shared.domain.repository.PayoutRequestRepository;
import com.example.lms.shared.domain.repository.RevenueSplitRepository;
import com.example.lms.shared.domain.repository.TeacherBankAccountRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("GetTeacherRevenueUseCase Tests")
class GetTeacherRevenueUseCaseTest {

    @Mock private RevenueSplitRepository revenueSplitRepository;
    @Mock private PayoutRequestRepository payoutRequestRepository;
    @Mock private TeacherBankAccountRepository bankAccountRepository;
    @Mock private JpaCourseRepository courseRepository;
    @Mock private UserJpaRepository userRepository;
    @Mock private RevenueConfigService revenueConfigService;
    @Mock private LearningPackageRevenuePort learningPackageRevenuePort;

    @InjectMocks
    private GetTeacherRevenueUseCase useCase;

    @Test
    @DisplayName("getSummary should include learning package revenue")
    void getSummaryShouldIncludeLearningPackageRevenue() {
        UUID teacherId = UUID.randomUUID();
        when(revenueSplitRepository.sumTeacherAmountByTeacherId(teacherId)).thenReturn(BigDecimal.valueOf(200000));
        when(learningPackageRevenuePort.sumTeacherAmountByTeacherId(teacherId)).thenReturn(BigDecimal.valueOf(300000));
        when(revenueSplitRepository.sumTeacherAmountThisMonth(teacherId)).thenReturn(BigDecimal.valueOf(100000));
        when(learningPackageRevenuePort.sumTeacherAmountThisMonth(teacherId)).thenReturn(BigDecimal.valueOf(50000));
        when(revenueSplitRepository.sumTeacherAmountLastMonth(teacherId)).thenReturn(BigDecimal.valueOf(50000));
        when(learningPackageRevenuePort.sumTeacherAmountLastMonth(teacherId)).thenReturn(BigDecimal.valueOf(50000));
        when(revenueSplitRepository.countDistinctCoursesByTeacherId(teacherId)).thenReturn(2L);

        var summary = useCase.getSummary(teacherId);

        assertThat(summary.totalRevenue()).isEqualByComparingTo(BigDecimal.valueOf(500000));
        assertThat(summary.thisMonthRevenue()).isEqualByComparingTo(BigDecimal.valueOf(150000));
        assertThat(summary.lastMonthRevenue()).isEqualByComparingTo(BigDecimal.valueOf(100000));
        assertThat(summary.growthPercentage()).isEqualTo(50.0);
        assertThat(summary.totalCoursesSold()).isEqualTo(2L);
    }

    @Test
    @DisplayName("getBalance should include learning package revenue")
    void getBalanceShouldIncludeLearningPackageRevenue() {
        UUID teacherId = UUID.randomUUID();
        when(revenueSplitRepository.sumTeacherAmountByTeacherId(teacherId)).thenReturn(BigDecimal.valueOf(200000));
        when(learningPackageRevenuePort.sumTeacherAmountByTeacherId(teacherId)).thenReturn(BigDecimal.valueOf(300000));
        when(payoutRequestRepository.sumCompletedByTeacherId(teacherId)).thenReturn(BigDecimal.valueOf(100000));
        when(payoutRequestRepository.sumPendingAndApprovedByTeacherId(teacherId)).thenReturn(BigDecimal.valueOf(50000));
        when(userRepository.findById(teacherId)).thenReturn(Optional.empty());
        when(revenueConfigService.resolveConfig(null))
                .thenReturn(OrgPaymentConfig.create(null, BigDecimal.valueOf(20), BigDecimal.valueOf(70), BigDecimal.valueOf(100000)));

        var balance = useCase.getBalance(teacherId);

        assertThat(balance.availableBalance()).isEqualByComparingTo(BigDecimal.valueOf(350000));
        assertThat(balance.pendingBalance()).isEqualByComparingTo(BigDecimal.valueOf(50000));
        assertThat(balance.totalWithdrawn()).isEqualByComparingTo(BigDecimal.valueOf(100000));
    }
}
