package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CategoryJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CategoryJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AdminCoursesControllerV3.
 * Focuses on analytics counting for both ADMIN (system-wide) and ORG_ADMIN (org-scoped),
 * and verifying role-based endpoint access patterns.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AdminCoursesControllerV3 Tests")
class AdminCoursesControllerV3Test {

    @Mock private CourseRepository courseRepository;
    @Mock private UserJpaRepository userRepository;
    @Mock private CategoryJpaRepository categoryRepository;
    @Mock private JpaEnrollmentRepository enrollmentRepository;
    @Mock private PaymentTransactionJpaRepository paymentTransactionRepository;
    @Mock private com.example.lms.course_authoring.application.usecase.ApproveCourseUseCase approveCourseUseCase;
    @Mock private com.example.lms.course_authoring.application.usecase.RejectCourseUseCase rejectCourseUseCase;

    @InjectMocks private AdminCoursesControllerV3 controller;

    private UserJpaEntity adminUser;
    private UserJpaEntity orgAdminUser;
    private UUID orgId;

    @BeforeEach
    void setUpUsers() {
        orgId = UUID.randomUUID();
        adminUser = mock(UserJpaEntity.class);
        orgAdminUser = mock(UserJpaEntity.class);
    }

    @Nested
    @DisplayName("Analytics - ADMIN (System-wide)")
    class AnalyticsAdminTests {

        @BeforeEach
        void setUpMocks() {
            when(adminUser.getRole()).thenReturn(UserJpaEntity.UserRole.ADMIN);

            // Course counts
            when(courseRepository.count()).thenReturn(50L);
            when(courseRepository.countByStatus(Course.CourseStatus.PENDING)).thenReturn(5L);
            when(courseRepository.countByStatus(Course.CourseStatus.APPROVED)).thenReturn(30L);
            when(courseRepository.countByStatus(Course.CourseStatus.DRAFT)).thenReturn(10L);
            when(courseRepository.countByStatus(Course.CourseStatus.REJECTED)).thenReturn(5L);

            // Enrollment count
            when(enrollmentRepository.count()).thenReturn(200L);

            // Revenue
            when(paymentTransactionRepository.sumTotalRevenue()).thenReturn(BigDecimal.valueOf(50000));
            when(paymentTransactionRepository.sumRevenueByDateRange(any(), any())).thenReturn(BigDecimal.valueOf(5000));
        }

        @Test
        @DisplayName("totalAdmins should count both ADMIN and ORG_ADMIN users")
        void totalAdminsShouldCountBothAdminAndOrgAdmin() {
            // Given
            when(userRepository.count()).thenReturn(100L);
            when(userRepository.countByRole(UserJpaEntity.UserRole.TEACHER)).thenReturn(20L);
            when(userRepository.countByRole(UserJpaEntity.UserRole.STUDENT)).thenReturn(75L);
            when(userRepository.countByRole(UserJpaEntity.UserRole.ADMIN)).thenReturn(2L);
            when(userRepository.countByRole(UserJpaEntity.UserRole.ORG_ADMIN)).thenReturn(3L);

            // When
            ResponseEntity<?> response = controller.getCourseAnalytics(adminUser);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);

            // Verify both ADMIN and ORG_ADMIN were counted
            verify(userRepository).countByRole(UserJpaEntity.UserRole.ADMIN);
            verify(userRepository).countByRole(UserJpaEntity.UserRole.ORG_ADMIN);

            // Extract analytics from response
            var apiResponse = (com.example.lms.shared.infrastructure.web.ApiResponse<?>) response.getBody();
            assertThat(apiResponse).isNotNull();
            assertThat(apiResponse.isSuccess()).isTrue();

            var analytics = (AdminCoursesControllerV3.CourseAnalyticsResponse) apiResponse.getData();
            assertThat(analytics.getTotalAdmins()).isEqualTo(5L); // 2 ADMIN + 3 ORG_ADMIN
            assertThat(analytics.getTotalTeachers()).isEqualTo(20L);
            assertThat(analytics.getTotalStudents()).isEqualTo(75L);
            assertThat(analytics.getTotalUsers()).isEqualTo(100L);
        }

        @Test
        @DisplayName("totalAdmins should be 0 when no admins exist")
        void totalAdminsShouldBeZeroWhenNoAdmins() {
            // Given
            when(userRepository.count()).thenReturn(50L);
            when(userRepository.countByRole(UserJpaEntity.UserRole.TEACHER)).thenReturn(10L);
            when(userRepository.countByRole(UserJpaEntity.UserRole.STUDENT)).thenReturn(40L);
            when(userRepository.countByRole(UserJpaEntity.UserRole.ADMIN)).thenReturn(0L);
            when(userRepository.countByRole(UserJpaEntity.UserRole.ORG_ADMIN)).thenReturn(0L);

            // When
            ResponseEntity<?> response = controller.getCourseAnalytics(adminUser);

            // Then
            var apiResponse = (com.example.lms.shared.infrastructure.web.ApiResponse<?>) response.getBody();
            var analytics = (AdminCoursesControllerV3.CourseAnalyticsResponse) apiResponse.getData();
            assertThat(analytics.getTotalAdmins()).isEqualTo(0L);
        }

        @Test
        @DisplayName("Analytics should include all course status counts")
        void analyticsShouldIncludeAllCourseStatusCounts() {
            // Given
            when(userRepository.count()).thenReturn(100L);
            when(userRepository.countByRole(UserJpaEntity.UserRole.TEACHER)).thenReturn(20L);
            when(userRepository.countByRole(UserJpaEntity.UserRole.STUDENT)).thenReturn(75L);
            when(userRepository.countByRole(UserJpaEntity.UserRole.ADMIN)).thenReturn(3L);
            when(userRepository.countByRole(UserJpaEntity.UserRole.ORG_ADMIN)).thenReturn(2L);

            // When
            ResponseEntity<?> response = controller.getCourseAnalytics(adminUser);

            // Then
            var apiResponse = (com.example.lms.shared.infrastructure.web.ApiResponse<?>) response.getBody();
            var analytics = (AdminCoursesControllerV3.CourseAnalyticsResponse) apiResponse.getData();
            assertThat(analytics.getTotalCourses()).isEqualTo(50L);
            assertThat(analytics.getPendingCourses()).isEqualTo(5L);
            assertThat(analytics.getPublishedCourses()).isEqualTo(30L);
            assertThat(analytics.getDraftCourses()).isEqualTo(10L);
            assertThat(analytics.getRejectedCourses()).isEqualTo(5L);
            assertThat(analytics.getTotalEnrollments()).isEqualTo(200L);
            assertThat(analytics.getTotalRevenue()).isEqualTo(50000.0);
            assertThat(analytics.getMonthlyRevenue()).isEqualTo(5000.0);
        }

        @Test
        @DisplayName("Revenue should handle null database values gracefully")
        void revenueShouldHandleNullGracefully() {
            // Given
            when(userRepository.count()).thenReturn(10L);
            when(userRepository.countByRole(any())).thenReturn(0L);
            when(paymentTransactionRepository.sumTotalRevenue()).thenReturn(null);
            when(paymentTransactionRepository.sumRevenueByDateRange(any(), any())).thenReturn(null);

            // When
            ResponseEntity<?> response = controller.getCourseAnalytics(adminUser);

            // Then
            var apiResponse = (com.example.lms.shared.infrastructure.web.ApiResponse<?>) response.getBody();
            var analytics = (AdminCoursesControllerV3.CourseAnalyticsResponse) apiResponse.getData();
            assertThat(analytics.getTotalRevenue()).isEqualTo(0.0);
            assertThat(analytics.getMonthlyRevenue()).isEqualTo(0.0);
        }
    }

    @Nested
    @DisplayName("Analytics - ORG_ADMIN (Org-scoped)")
    class AnalyticsOrgAdminTests {

        private UUID teacherId1;
        private UUID teacherId2;
        private Set<UUID> orgTeacherIds;
        private List<UUID> orgCourseIds;

        @BeforeEach
        void setUpOrgData() {
            when(orgAdminUser.getRole()).thenReturn(UserJpaEntity.UserRole.ORG_ADMIN);
            when(orgAdminUser.getOrganizationId()).thenReturn(orgId);

            teacherId1 = UUID.randomUUID();
            teacherId2 = UUID.randomUUID();
            orgTeacherIds = Set.of(teacherId1, teacherId2);

            UUID courseId1 = UUID.randomUUID();
            UUID courseId2 = UUID.randomUUID();
            UUID courseId3 = UUID.randomUUID();
            orgCourseIds = List.of(courseId1, courseId2, courseId3);
        }

        @Test
        @DisplayName("ORG_ADMIN analytics should only count org members and org courses")
        void orgAdminShouldReturnOrgScopedAnalytics() {
            // Given
            UserJpaEntity teacher1 = mock(UserJpaEntity.class);
            when(teacher1.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);
            when(teacher1.getId()).thenReturn(teacherId1);

            UserJpaEntity teacher2 = mock(UserJpaEntity.class);
            when(teacher2.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);
            when(teacher2.getId()).thenReturn(teacherId2);

            UserJpaEntity student1 = mock(UserJpaEntity.class);
            when(student1.getRole()).thenReturn(UserJpaEntity.UserRole.STUDENT);

            UserJpaEntity student2 = mock(UserJpaEntity.class);
            when(student2.getRole()).thenReturn(UserJpaEntity.UserRole.STUDENT);

            UserJpaEntity orgAdmin = mock(UserJpaEntity.class);
            when(orgAdmin.getRole()).thenReturn(UserJpaEntity.UserRole.ORG_ADMIN);

            when(userRepository.findByOrganizationId(orgId))
                    .thenReturn(List.of(teacher1, teacher2, student1, student2, orgAdmin));
            when(courseRepository.countByTeacherIdIn(anySet())).thenReturn(3L);
            when(courseRepository.countByStatusAndTeacherIdIn(eq(Course.CourseStatus.PENDING), anySet())).thenReturn(1L);
            when(courseRepository.countByStatusAndTeacherIdIn(eq(Course.CourseStatus.APPROVED), anySet())).thenReturn(1L);
            when(courseRepository.countByStatusAndTeacherIdIn(eq(Course.CourseStatus.DRAFT), anySet())).thenReturn(1L);
            when(courseRepository.countByStatusAndTeacherIdIn(eq(Course.CourseStatus.REJECTED), anySet())).thenReturn(0L);
            when(courseRepository.findCourseIdsByTeacherIdIn(anySet())).thenReturn(orgCourseIds);

            when(enrollmentRepository.countTotalByCourseIds(orgCourseIds)).thenReturn(15L);
            when(paymentTransactionRepository.sumRevenueByCourseIds(orgCourseIds)).thenReturn(BigDecimal.valueOf(10000));
            when(paymentTransactionRepository.sumRevenueByCourseIdsAndDateRange(eq(orgCourseIds), any(), any()))
                    .thenReturn(BigDecimal.valueOf(2000));

            // When
            ResponseEntity<?> response = controller.getCourseAnalytics(orgAdminUser);

            // Then
            var apiResponse = (com.example.lms.shared.infrastructure.web.ApiResponse<?>) response.getBody();
            assertThat(apiResponse).isNotNull();
            var analytics = (AdminCoursesControllerV3.CourseAnalyticsResponse) apiResponse.getData();

            // Org member counts
            assertThat(analytics.getTotalUsers()).isEqualTo(5L);
            assertThat(analytics.getTotalTeachers()).isEqualTo(2L);
            assertThat(analytics.getTotalStudents()).isEqualTo(2L);
            assertThat(analytics.getTotalAdmins()).isEqualTo(1L); // 1 ORG_ADMIN

            // Org course counts
            assertThat(analytics.getTotalCourses()).isEqualTo(3L);
            assertThat(analytics.getPendingCourses()).isEqualTo(1L);
            assertThat(analytics.getPublishedCourses()).isEqualTo(1L);
            assertThat(analytics.getDraftCourses()).isEqualTo(1L);
            assertThat(analytics.getRejectedCourses()).isEqualTo(0L);

            // Org enrollment + revenue
            assertThat(analytics.getTotalEnrollments()).isEqualTo(15L);
            assertThat(analytics.getTotalRevenue()).isEqualTo(10000.0);
            assertThat(analytics.getMonthlyRevenue()).isEqualTo(2000.0);

            // Verify system-wide queries were NOT called
            verify(courseRepository, never()).count();
            verify(courseRepository, never()).countByStatus(any());
            verify(userRepository, never()).count();
            verify(userRepository, never()).countByRole(any());
            verify(enrollmentRepository, never()).count();
            verify(paymentTransactionRepository, never()).sumTotalRevenue();
        }

        @Test
        @DisplayName("ORG_ADMIN with no org teachers should return all zeros for course/enrollment/revenue")
        void orgAdminNoTeachersShouldReturnZeros() {
            // Given — override to return no teachers
            UserJpaEntity orgAdmin = mock(UserJpaEntity.class);
            when(orgAdmin.getRole()).thenReturn(UserJpaEntity.UserRole.ORG_ADMIN);
            when(userRepository.findByOrganizationId(orgId)).thenReturn(List.of(orgAdmin));

            // When
            ResponseEntity<?> response = controller.getCourseAnalytics(orgAdminUser);

            // Then
            var apiResponse = (com.example.lms.shared.infrastructure.web.ApiResponse<?>) response.getBody();
            var analytics = (AdminCoursesControllerV3.CourseAnalyticsResponse) apiResponse.getData();

            assertThat(analytics.getTotalUsers()).isEqualTo(1L);
            assertThat(analytics.getTotalTeachers()).isEqualTo(0L);
            assertThat(analytics.getTotalCourses()).isEqualTo(0L);
            assertThat(analytics.getTotalEnrollments()).isEqualTo(0L);
            assertThat(analytics.getTotalRevenue()).isEqualTo(0.0);
            assertThat(analytics.getMonthlyRevenue()).isEqualTo(0.0);
        }
    }

    @Nested
    @DisplayName("Delete Course - ADMIN Only Tests")
    class DeleteCourseTests {

        @Test
        @DisplayName("Should delete course when it exists")
        void shouldDeleteCourseWhenExists() {
            // Given
            UUID courseId = UUID.randomUUID();
            when(courseRepository.existsById(courseId)).thenReturn(true);

            // When
            ResponseEntity<?> response = controller.deleteCourse(courseId);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(courseRepository).deleteById(courseId);
        }

        @Test
        @DisplayName("Should throw EntityNotFoundException when course does not exist")
        void shouldReturn404WhenCourseNotExists() {
            // Given
            UUID courseId = UUID.randomUUID();
            when(courseRepository.existsById(courseId)).thenReturn(false);

            // When/Then
            assertThatThrownBy(() -> controller.deleteCourse(courseId))
                    .isInstanceOf(com.example.lms.shared.exception.EntityNotFoundException.class);
            verify(courseRepository, never()).deleteById(any());
        }
    }
}
