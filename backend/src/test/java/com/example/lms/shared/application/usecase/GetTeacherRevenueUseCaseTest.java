package com.example.lms.shared.application.usecase;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.application.port.LearningPackageRevenuePort;
import com.example.lms.shared.domain.model.OrgPaymentConfig;
import com.example.lms.shared.domain.model.RevenueSplit;
import com.example.lms.shared.domain.repository.PayoutRequestRepository;
import com.example.lms.shared.domain.repository.RevenueSplitRepository;
import com.example.lms.shared.domain.repository.TeacherBankAccountRepository;
import com.example.lms.shared.infrastructure.service.RevenueConfigService;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
        UUID courseA = UUID.randomUUID();
        UUID courseB = UUID.randomUUID();
        UUID courseC = UUID.randomUUID();
        when(revenueSplitRepository.sumTeacherAmountByTeacherId(teacherId)).thenReturn(BigDecimal.valueOf(200000));
        when(learningPackageRevenuePort.sumTeacherAmountByTeacherId(teacherId)).thenReturn(BigDecimal.valueOf(300000));
        when(revenueSplitRepository.sumTeacherAmountThisMonth(teacherId)).thenReturn(BigDecimal.valueOf(100000));
        when(learningPackageRevenuePort.sumTeacherAmountThisMonth(teacherId)).thenReturn(BigDecimal.valueOf(50000));
        when(revenueSplitRepository.sumTeacherAmountLastMonth(teacherId)).thenReturn(BigDecimal.valueOf(50000));
        when(learningPackageRevenuePort.sumTeacherAmountLastMonth(teacherId)).thenReturn(BigDecimal.valueOf(50000));
        when(revenueSplitRepository.findDistinctCourseIdsByTeacherId(teacherId)).thenReturn(List.of(courseA, courseB));
        when(learningPackageRevenuePort.findDistinctCourseIdsByTeacherId(teacherId)).thenReturn(List.of(courseB, courseC));

        var summary = useCase.getSummary(teacherId);

        assertThat(summary.totalRevenue()).isEqualByComparingTo(BigDecimal.valueOf(500000));
        assertThat(summary.thisMonthRevenue()).isEqualByComparingTo(BigDecimal.valueOf(150000));
        assertThat(summary.lastMonthRevenue()).isEqualByComparingTo(BigDecimal.valueOf(100000));
        assertThat(summary.growthPercentage()).isEqualTo(50.0);
        assertThat(summary.totalCoursesSold()).isEqualTo(3L);
    }

    @Test
    @DisplayName("getHistory should merge course and active package revenue lines")
    void getHistoryShouldMergeCourseAndPackageRevenueLines() {
        UUID teacherId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID packageCourseId = UUID.randomUUID();
        Instant courseCreatedAt = Instant.parse("2026-06-01T10:00:00Z");
        Instant packageCreatedAt = Instant.parse("2026-06-02T10:00:00Z");

        RevenueSplit courseSplit = RevenueSplit.reconstitute(
                UUID.randomUUID(),
                UUID.randomUUID(),
                courseId,
                teacherId,
                orgId,
                BigDecimal.valueOf(100000),
                BigDecimal.valueOf(20),
                BigDecimal.valueOf(70),
                BigDecimal.valueOf(10),
                BigDecimal.valueOf(20000),
                BigDecimal.valueOf(70000),
                BigDecimal.valueOf(10000),
                courseCreatedAt);
        var packageSplit = new LearningPackageRevenuePort.TeacherRevenueLine(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                packageCourseId,
                BigDecimal.valueOf(200000),
                BigDecimal.valueOf(20),
                BigDecimal.valueOf(70),
                BigDecimal.valueOf(40000),
                BigDecimal.valueOf(140000),
                packageCreatedAt);

        when(revenueSplitRepository.findByTeacherId(eq(teacherId), any()))
                .thenReturn(new PageImpl<>(List.of(courseSplit), PageRequest.of(0, 2), 1));
        when(learningPackageRevenuePort.findTeacherRevenueLines(eq(teacherId), any()))
                .thenReturn(new PageImpl<>(List.of(packageSplit), PageRequest.of(0, 2), 1));
        when(courseRepository.findAllById(any())).thenReturn(List.of(
                CourseJpaEntity.builder()
                        .id(courseId)
                        .code("COURSE-1")
                        .title("An toàn hàng hải")
                        .teacherId(teacherId)
                        .organizationId(orgId)
                        .build(),
                CourseJpaEntity.builder()
                        .id(packageCourseId)
                        .code("COURSE-2")
                        .title("Hải đồ điện tử")
                        .teacherId(teacherId)
                        .organizationId(orgId)
                        .build()));

        var history = useCase.getHistory(teacherId, 0, 2);

        assertThat(history.getTotalElements()).isEqualTo(2);
        assertThat(history.getContent()).hasSize(2);
        assertThat(history.getContent().get(0).source()).isEqualTo("PACKAGE");
        assertThat(history.getContent().get(0).courseName()).isEqualTo("Hải đồ điện tử (Gói học)");
        assertThat(history.getContent().get(0).teacherAmount()).isEqualByComparingTo(BigDecimal.valueOf(140000));
        assertThat(history.getContent().get(1).source()).isEqualTo("COURSE");
        assertThat(history.getContent().get(1).courseName()).isEqualTo("An toàn hàng hải");
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
