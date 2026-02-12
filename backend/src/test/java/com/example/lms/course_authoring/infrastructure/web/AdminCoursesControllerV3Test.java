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

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AdminCoursesControllerV3.
 * Focuses on analytics counting both ADMIN and ORG_ADMIN,
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

    @InjectMocks private AdminCoursesControllerV3 controller;

    @Nested
    @DisplayName("Analytics - Admin Count Tests")
    class AnalyticsAdminCountTests {

        @BeforeEach
        void setUpMocks() {
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
            ResponseEntity<?> response = controller.getCourseAnalytics();

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
            ResponseEntity<?> response = controller.getCourseAnalytics();

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
            ResponseEntity<?> response = controller.getCourseAnalytics();

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
            ResponseEntity<?> response = controller.getCourseAnalytics();

            // Then
            var apiResponse = (com.example.lms.shared.infrastructure.web.ApiResponse<?>) response.getBody();
            var analytics = (AdminCoursesControllerV3.CourseAnalyticsResponse) apiResponse.getData();
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
            java.util.UUID courseId = java.util.UUID.randomUUID();
            when(courseRepository.existsById(courseId)).thenReturn(true);

            // When
            ResponseEntity<?> response = controller.deleteCourse(courseId);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(courseRepository).deleteById(courseId);
        }

        @Test
        @DisplayName("Should return 404 when course does not exist")
        void shouldReturn404WhenCourseNotExists() {
            // Given
            java.util.UUID courseId = java.util.UUID.randomUUID();
            when(courseRepository.existsById(courseId)).thenReturn(false);

            // When
            ResponseEntity<?> response = controller.deleteCourse(courseId);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(404);
            verify(courseRepository, never()).deleteById(any());
        }
    }
}
