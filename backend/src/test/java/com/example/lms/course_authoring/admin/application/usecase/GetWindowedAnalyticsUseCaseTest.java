package com.example.lms.course_authoring.admin.application.usecase;

import com.example.lms.course_authoring.admin.application.dto.WindowedAnalyticsResponse;
import com.example.lms.course_authoring.admin.application.port.AdminAnalyticsPort;
import com.example.lms.shared.exception.ValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("GetWindowedAnalyticsUseCase Tests")
class GetWindowedAnalyticsUseCaseTest {

    private static final Instant NOW = Instant.parse("2026-04-25T00:00:00Z");

    @Mock private AdminAnalyticsPort port;

    private GetWindowedAnalyticsUseCase useCase;

    @BeforeEach
    void setUp() {
        Clock fixed = Clock.fixed(NOW, ZoneOffset.UTC);
        useCase = new GetWindowedAnalyticsUseCase(port, fixed);
    }

    @Nested
    @DisplayName("Days validation")
    class DaysValidationTests {

        @ParameterizedTest
        @ValueSource(ints = {7, 30, 90})
        @DisplayName("Should accept days = 7, 30, 90")
        void shouldAcceptValidWindow(int days) {
            stubSystemWideZeros();

            WindowedAnalyticsResponse response = useCase.execute(days, null);

            assertThat(response.windowDays()).isEqualTo(days);
            assertThat(response.windowEnd()).isEqualTo(NOW);
            assertThat(response.windowStart()).isEqualTo(NOW.minus(days, ChronoUnit.DAYS));
        }

        @ParameterizedTest
        @ValueSource(ints = {0, 1, 6, 8, 15, 29, 31, 60, 89, 91, 365})
        @DisplayName("Should throw ValidationException for invalid days values (→ 400)")
        void shouldRejectInvalidWindow(int days) {
            assertThatThrownBy(() -> useCase.execute(days, null))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("days")
                    .hasMessageContaining(String.valueOf(days));
        }

        @Test
        @DisplayName("Should reject negative days")
        void shouldRejectNegativeDays() {
            assertThatThrownBy(() -> useCase.execute(-7, null))
                    .isInstanceOf(ValidationException.class);
        }
    }

    @Nested
    @DisplayName("SYSTEM_ADMIN — system-wide aggregation")
    class SystemWideTests {

        @Test
        @DisplayName("Should aggregate system-wide totals + windowed growth for days=7")
        void shouldAggregateSystemWide() {
            Instant windowStart = NOW.minus(7, ChronoUnit.DAYS);
            Instant prevStart = NOW.minus(14, ChronoUnit.DAYS);

            when(port.countAllUsers()).thenReturn(43L);
            when(port.countAllCourses()).thenReturn(10L);
            when(port.countAllEnrollments()).thenReturn(67L);
            when(port.countUsersCreatedBetween(windowStart, NOW)).thenReturn(4L);
            when(port.countUsersCreatedBetween(prevStart, windowStart)).thenReturn(2L);
            when(port.countCoursesCreatedBetween(windowStart, NOW)).thenReturn(3L);
            when(port.countCoursesCreatedBetween(prevStart, windowStart)).thenReturn(2L);
            when(port.sumRevenueBetween(windowStart, NOW)).thenReturn(new BigDecimal("1500.00"));
            when(port.sumRevenueBetween(prevStart, windowStart)).thenReturn(new BigDecimal("1000.00"));

            WindowedAnalyticsResponse r = useCase.execute(7, null);

            assertThat(r.windowDays()).isEqualTo(7);
            assertThat(r.totalUsers()).isEqualTo(43L);
            assertThat(r.totalCourses()).isEqualTo(10L);
            assertThat(r.totalEnrollments()).isEqualTo(67L);
            assertThat(r.revenue()).isEqualTo(1500.0);

            assertThat(r.userGrowth().thisWindow()).isEqualTo(4L);
            assertThat(r.userGrowth().lastWindow()).isEqualTo(2L);
            assertThat(r.userGrowth().growthRate()).isEqualTo(100.0);

            assertThat(r.courseGrowth().thisWindow()).isEqualTo(3L);
            assertThat(r.courseGrowth().lastWindow()).isEqualTo(2L);
            assertThat(r.courseGrowth().growthRate()).isEqualTo(50.0);

            assertThat(r.revenueGrowth()).isEqualTo(50.0);
            assertThat(r.windowEnd()).isEqualTo(NOW);
            assertThat(r.windowStart()).isEqualTo(windowStart);

            // Verify no org-scoped queries were called
            verify(port, never()).findCourseIdsByOrganization(any());
            verify(port, never()).countUsersByOrganization(any());
            verify(port, never()).countCoursesByOrganization(any());
        }

        @Test
        @DisplayName("Window arithmetic: days=30 produces 30-day windows")
        void daysThirtyProducesThirtyDayWindow() {
            stubSystemWideZeros();

            WindowedAnalyticsResponse r = useCase.execute(30, null);

            assertThat(r.windowEnd()).isEqualTo(NOW);
            assertThat(r.windowStart()).isEqualTo(NOW.minus(30, ChronoUnit.DAYS));
            verify(port).countUsersCreatedBetween(NOW.minus(30, ChronoUnit.DAYS), NOW);
            verify(port).countUsersCreatedBetween(NOW.minus(60, ChronoUnit.DAYS), NOW.minus(30, ChronoUnit.DAYS));
        }

        @Test
        @DisplayName("Window arithmetic: days=90 produces 90-day windows")
        void daysNinetyProducesNinetyDayWindow() {
            stubSystemWideZeros();

            WindowedAnalyticsResponse r = useCase.execute(90, null);

            assertThat(r.windowStart()).isEqualTo(NOW.minus(90, ChronoUnit.DAYS));
            verify(port).countCoursesCreatedBetween(NOW.minus(90, ChronoUnit.DAYS), NOW);
            verify(port).countCoursesCreatedBetween(NOW.minus(180, ChronoUnit.DAYS), NOW.minus(90, ChronoUnit.DAYS));
        }
    }

    @Nested
    @DisplayName("ORG_ADMIN — org-scoped aggregation")
    class OrgScopedTests {

        @Test
        @DisplayName("Should scope every count to the organization when orgId is provided")
        void shouldScopeAllCountsToOrganization() {
            UUID orgId = UUID.randomUUID();
            UUID courseId = UUID.randomUUID();
            List<UUID> courseIds = List.of(courseId);

            Instant windowStart = NOW.minus(7, ChronoUnit.DAYS);
            Instant prevStart = NOW.minus(14, ChronoUnit.DAYS);

            when(port.findCourseIdsByOrganization(orgId)).thenReturn(courseIds);
            when(port.countUsersByOrganization(orgId)).thenReturn(12L);
            when(port.countCoursesByOrganization(orgId)).thenReturn(4L);
            when(port.countEnrollmentsByCourseIds(courseIds)).thenReturn(20L);
            when(port.countUsersCreatedBetweenInOrganization(orgId, windowStart, NOW)).thenReturn(2L);
            when(port.countUsersCreatedBetweenInOrganization(orgId, prevStart, windowStart)).thenReturn(1L);
            when(port.countCoursesCreatedBetweenInOrganization(orgId, windowStart, NOW)).thenReturn(1L);
            when(port.countCoursesCreatedBetweenInOrganization(orgId, prevStart, windowStart)).thenReturn(0L);
            when(port.sumRevenueBetweenInOrganization(orgId, windowStart, NOW)).thenReturn(new BigDecimal("250.00"));
            when(port.sumRevenueBetweenInOrganization(orgId, prevStart, windowStart)).thenReturn(new BigDecimal("100.00"));

            WindowedAnalyticsResponse r = useCase.execute(7, orgId);

            assertThat(r.totalUsers()).isEqualTo(12L);
            assertThat(r.totalCourses()).isEqualTo(4L);
            assertThat(r.totalEnrollments()).isEqualTo(20L);
            assertThat(r.revenue()).isEqualTo(250.0);

            assertThat(r.userGrowth().thisWindow()).isEqualTo(2L);
            assertThat(r.userGrowth().lastWindow()).isEqualTo(1L);
            assertThat(r.userGrowth().growthRate()).isEqualTo(100.0);

            // courseGrowth: lastWindow=0, thisWindow>0 → growthRate null
            assertThat(r.courseGrowth().thisWindow()).isEqualTo(1L);
            assertThat(r.courseGrowth().lastWindow()).isEqualTo(0L);
            assertThat(r.courseGrowth().growthRate()).isNull();

            assertThat(r.revenueGrowth()).isEqualTo(150.0);

            // System-wide queries must NOT be called
            verify(port, never()).countAllUsers();
            verify(port, never()).countAllCourses();
            verify(port, never()).countAllEnrollments();
            verify(port, never()).countUsersCreatedBetween(any(), any());
            verify(port, never()).countCoursesCreatedBetween(any(), any());
            verify(port, never()).sumRevenueBetween(any(), any());
        }

        @Test
        @DisplayName("ORG_ADMIN with no teachers in org should return zeros for course/revenue")
        void orgAdminEmptyTeachersReturnsZeros() {
            UUID orgId = UUID.randomUUID();

            when(port.findCourseIdsByOrganization(orgId)).thenReturn(List.of());
            when(port.countUsersByOrganization(orgId)).thenReturn(1L);
            when(port.countCoursesByOrganization(orgId)).thenReturn(0L);
            when(port.countEnrollmentsByCourseIds(List.of())).thenReturn(0L);
            when(port.countUsersCreatedBetweenInOrganization(eq(orgId), any(), any())).thenReturn(0L);
            when(port.countCoursesCreatedBetweenInOrganization(eq(orgId), any(), any())).thenReturn(0L);
            when(port.sumRevenueBetweenInOrganization(eq(orgId), any(), any())).thenReturn(BigDecimal.ZERO);

            WindowedAnalyticsResponse r = useCase.execute(7, orgId);

            assertThat(r.totalUsers()).isEqualTo(1L);
            assertThat(r.totalCourses()).isZero();
            assertThat(r.totalEnrollments()).isZero();
            assertThat(r.revenue()).isZero();
            assertThat(r.userGrowth().thisWindow()).isZero();
            assertThat(r.userGrowth().growthRate()).isEqualTo(0.0);
            assertThat(r.courseGrowth().growthRate()).isEqualTo(0.0);
            assertThat(r.revenueGrowth()).isEqualTo(0.0);
        }
    }

    @Nested
    @DisplayName("Growth rate edge cases")
    class GrowthRateEdgeCases {

        @Test
        @DisplayName("Both windows zero → growthRate 0.0 (no change)")
        void bothZeroIsZeroGrowth() {
            stubSystemWideZeros();
            WindowedAnalyticsResponse r = useCase.execute(7, null);
            assertThat(r.userGrowth().growthRate()).isEqualTo(0.0);
            assertThat(r.courseGrowth().growthRate()).isEqualTo(0.0);
            assertThat(r.revenueGrowth()).isEqualTo(0.0);
        }

        @Test
        @DisplayName("lastWindow = 0 with positive thisWindow → growthRate null (FE renders +∞)")
        void lastZeroPositiveThisIsNull() {
            when(port.countAllUsers()).thenReturn(0L);
            when(port.countAllCourses()).thenReturn(0L);
            when(port.countAllEnrollments()).thenReturn(0L);
            when(port.countUsersCreatedBetween(any(), any()))
                    .thenReturn(5L)   // thisWindow
                    .thenReturn(0L);  // lastWindow
            when(port.countCoursesCreatedBetween(any(), any())).thenReturn(0L);
            when(port.sumRevenueBetween(any(), any()))
                    .thenReturn(new BigDecimal("123.45"))
                    .thenReturn(BigDecimal.ZERO);

            WindowedAnalyticsResponse r = useCase.execute(7, null);

            assertThat(r.userGrowth().growthRate()).isNull();
            assertThat(r.revenueGrowth()).isNull();
        }

        @Test
        @DisplayName("Decline (50 → 25) → growthRate -50.0")
        void declineProducesNegativeGrowth() {
            when(port.countAllUsers()).thenReturn(100L);
            when(port.countAllCourses()).thenReturn(10L);
            when(port.countAllEnrollments()).thenReturn(50L);
            when(port.countUsersCreatedBetween(any(), any()))
                    .thenReturn(25L)   // thisWindow
                    .thenReturn(50L);  // lastWindow
            when(port.countCoursesCreatedBetween(any(), any())).thenReturn(0L);
            when(port.sumRevenueBetween(any(), any())).thenReturn(BigDecimal.ZERO);

            WindowedAnalyticsResponse r = useCase.execute(7, null);

            assertThat(r.userGrowth().growthRate()).isEqualTo(-50.0);
        }
    }

    private void stubSystemWideZeros() {
        when(port.countAllUsers()).thenReturn(0L);
        when(port.countAllCourses()).thenReturn(0L);
        when(port.countAllEnrollments()).thenReturn(0L);
        when(port.countUsersCreatedBetween(any(), any())).thenReturn(0L);
        when(port.countCoursesCreatedBetween(any(), any())).thenReturn(0L);
        when(port.sumRevenueBetween(any(), any())).thenReturn(BigDecimal.ZERO);
    }
}
