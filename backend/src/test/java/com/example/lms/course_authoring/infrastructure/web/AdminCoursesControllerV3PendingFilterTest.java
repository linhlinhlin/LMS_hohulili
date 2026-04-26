package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.admin.application.usecase.GetWindowedAnalyticsUseCase;
import com.example.lms.course_authoring.application.usecase.ApproveCourseUseCase;
import com.example.lms.course_authoring.application.usecase.RejectCourseUseCase;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseCategoryJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseReviewEventJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifies the alignment between the "Chờ duyệt" KPI and the
 * `GET /admin/courses/all?status=PENDING` table page introduced in
 * issue #191 (F-C1).
 *
 * <p>Before the fix, the KPI used the review-queue predicate
 * (PENDING ∪ APPROVED+PENDING_REVIEW) while the table filter used the
 * strict status equality. The two diverged whenever a teacher
 * resubmitted an APPROVED course.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AdminCoursesControllerV3 — pending filter alignment (issue #191)")
class AdminCoursesControllerV3PendingFilterTest {

    @Mock private CourseRepository courseRepository;
    @Mock private UserJpaRepository userRepository;
    @Mock private CourseCategoryJpaRepository categoryRepository;
    @Mock private JpaEnrollmentRepository enrollmentRepository;
    @Mock private PaymentTransactionJpaRepository paymentTransactionRepository;
    @Mock private ApproveCourseUseCase approveCourseUseCase;
    @Mock private RejectCourseUseCase rejectCourseUseCase;
    @Mock private CourseReviewEventJpaRepository reviewEventRepository;
    @Mock private GetWindowedAnalyticsUseCase getWindowedAnalyticsUseCase;

    @InjectMocks private AdminCoursesControllerV3 controller;

    private UserJpaEntity adminUser;
    private UserJpaEntity orgAdminUser;
    private UUID orgId;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
        adminUser = new UserJpaEntity(
                UUID.randomUUID(), "admin", "admin@m.edu", "pwd",
                "Admin", UserJpaEntity.UserRole.ADMIN, true,
                java.time.Instant.now(), null);
        orgAdminUser = new UserJpaEntity(
                UUID.randomUUID(), "orgadmin", "orgadmin@m.edu", "pwd",
                "Org Admin", UserJpaEntity.UserRole.ORG_ADMIN, true,
                java.time.Instant.now(), null);
        orgAdminUser.setOrganizationId(orgId);
    }

    @Test
    @DisplayName("ADMIN: status=PENDING routes through findReviewQueue (matches KPI)")
    void adminPendingFilterRoutesThroughReviewQueue() {
        Page<Course> emptyPage = new PageImpl<>(List.of());
        when(courseRepository.findReviewQueue(any(Pageable.class))).thenReturn(emptyPage);

        controller.getAllCourses(0, 10, "PENDING", null, null, null, null, adminUser);

        verify(courseRepository).findReviewQueue(any(Pageable.class));
        // The strict-status path must NOT be taken — that was the source of
        // the mismatch reported in #191.
        verify(courseRepository, never()).findByStatus(eq(Course.CourseStatus.PENDING), any(Pageable.class));
    }

    @Test
    @DisplayName("ADMIN: status=pending (lower-case) is also normalised to review queue")
    void adminPendingFilterIsCaseInsensitive() {
        Page<Course> emptyPage = new PageImpl<>(List.of());
        when(courseRepository.findReviewQueue(any(Pageable.class))).thenReturn(emptyPage);

        controller.getAllCourses(0, 10, "pending", null, null, null, null, adminUser);

        verify(courseRepository).findReviewQueue(any(Pageable.class));
    }

    @Test
    @DisplayName("ADMIN: non-pending status (APPROVED) preserves strict status filter")
    void adminApprovedFilterUsesStrictStatus() {
        Page<Course> emptyPage = new PageImpl<>(List.of());
        when(courseRepository.findByStatus(eq(Course.CourseStatus.APPROVED), any(Pageable.class)))
                .thenReturn(emptyPage);

        controller.getAllCourses(0, 10, "APPROVED", null, null, null, null, adminUser);

        verify(courseRepository).findByStatus(eq(Course.CourseStatus.APPROVED), any(Pageable.class));
        verify(courseRepository, never()).findReviewQueue(any(Pageable.class));
    }

    @Test
    @DisplayName("ORG_ADMIN: status=PENDING routes through findReviewQueueByTeacherIds")
    void orgAdminPendingFilterRoutesThroughOrgScopedReviewQueue() {
        when(userRepository.findByOrganizationId(orgId))
                .thenReturn(List.of(teacher(UUID.randomUUID())));
        Page<Course> emptyPage = new PageImpl<>(List.of());
        when(courseRepository.findReviewQueueByTeacherIds(anySet(), any(Pageable.class)))
                .thenReturn(emptyPage);

        controller.getAllCourses(0, 10, "PENDING", null, null, null, null, orgAdminUser);

        verify(courseRepository).findReviewQueueByTeacherIds(anySet(), any(Pageable.class));
        verify(courseRepository, never())
                .findByTeacherIdsAndStatus(anySet(), eq(Course.CourseStatus.PENDING), any(Pageable.class));
    }

    @Test
    @DisplayName("ADMIN: PENDING + search filters by title against the review queue page")
    @org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
    void adminPendingFilterCombinesWithTitleSearch() {
        UUID matchId = UUID.randomUUID();
        Course matching = mock(Course.class);
        when(matching.getId()).thenReturn(matchId);
        when(matching.getTitle()).thenReturn("Maritime Safety 101");
        when(matching.getTeacherId()).thenReturn(null);
        when(matching.getCategoryId()).thenReturn(null);
        when(matching.getStatus()).thenReturn(Course.CourseStatus.PENDING);
        when(matching.getDraftChangeStatus()).thenReturn(Course.DraftChangeStatus.NONE);

        Course nonMatching = mock(Course.class);
        // Only the title is consulted by the filter — stubs for other getters
        // are LENIENT to keep the test focused on the filter contract.
        when(nonMatching.getTitle()).thenReturn("Engine Fundamentals");

        when(courseRepository.findReviewQueue(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(matching, nonMatching)));
        when(reviewEventRepository.findByCourseIdInOrderByCreatedAtDesc(any())).thenReturn(List.of());
        when(enrollmentRepository.countEnrollmentsByCourseIds(any())).thenReturn(List.of());

        var response = controller.getAllCourses(0, 10, "PENDING", "safety", null, null, null, adminUser);

        @SuppressWarnings("ConstantConditions")
        var content = response.getBody().getData().getContent();
        assertThat(content).extracting(AdminCoursesControllerV3.CourseAdminResponse::getId)
                .containsExactly(matchId.toString());
    }

    private UserJpaEntity teacher(UUID id) {
        UserJpaEntity teacher = new UserJpaEntity(
                id, "t", "t@m.edu", "pwd", "Teacher",
                UserJpaEntity.UserRole.TEACHER, true,
                java.time.Instant.now(), null);
        teacher.setOrganizationId(orgId);
        return teacher;
    }

    // Inline mock helper so we don't need to expand the import block.
    private static <T> T mock(Class<T> clazz) {
        return org.mockito.Mockito.mock(clazz);
    }
}
