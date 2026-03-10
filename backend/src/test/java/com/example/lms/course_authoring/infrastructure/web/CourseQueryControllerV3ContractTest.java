package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseCategoryJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.EnrollmentRepositoryImpl;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourseQueryControllerV3ContractTest {

    @Mock private CourseRepository courseRepository;
    @Mock private LessonJpaRepository lessonRepository;
    @Mock private LearningClassRepository learningClassRepository;
    @Mock private EnrollmentRepositoryImpl enrollmentRepository;
    @Mock private JpaEnrollmentRepository enrollmentJpaRepository;
    @Mock private ChapterJpaRepository chapterRepository;
    @Mock private UserJpaRepository userJpaRepository;
    @Mock private CourseCategoryJpaRepository courseCategoryJpaRepository;
    @Mock private PaymentTransactionJpaRepository paymentRepository;

    @InjectMocks
    private CourseQueryControllerV3 controller;

    private Course approvedPaidCourse;
    private UUID teacherId;

    @BeforeEach
    void setUp() {
        teacherId = UUID.randomUUID();
        approvedPaidCourse = Course.create(CourseCode.of("LAW-101"), "Course title", "Course description", teacherId);
        approvedPaidCourse.updatePricing(Course.PriceType.PAID, BigDecimal.valueOf(1_500_000), BigDecimal.valueOf(1_200_000));
        approvedPaidCourse.updateDeliveryMode(Course.DeliveryMode.SELF_PACED);
        approvedPaidCourse.updateTags(Set.of("law"));
        approvedPaidCourse.submitForApproval();
        approvedPaidCourse.approve(UUID.randomUUID(), "approved");
    }

    @Test
    @DisplayName("public course list includes pricing, delivery mode and enrollment count")
    void getPublicCoursesIncludesPublicCommerceFields() {
        UserJpaEntity teacher = mock(UserJpaEntity.class);
        when(teacher.getId()).thenReturn(teacherId);
        when(teacher.getFullName()).thenReturn("Teacher Name");

        when(courseRepository.findByStatus(any(), any())).thenReturn(new PageImpl<>(List.of(approvedPaidCourse)));
        when(userJpaRepository.findAllById(any())).thenReturn(List.of(teacher));
        when(enrollmentJpaRepository.countEnrollmentsByCourseIds(any())).thenReturn(
                java.util.Collections.singletonList(new Object[] {approvedPaidCourse.getId(), 7L})
        );

        var response = controller.getPublicCourses(0, 20, null);

        assertThat(response.getBody()).isNotNull();
        ApiResponse<?> body = response.getBody();
        @SuppressWarnings("unchecked")
        var page = (org.springframework.data.domain.Page<CourseQueryControllerV3.CourseSummaryResponse>) body.getData();
        var item = page.getContent().getFirst();

        assertThat(item.getCode()).isEqualTo("LAW-101");
        assertThat(item.getDeliveryMode()).isEqualTo("SELF_PACED");
        assertThat(item.getPriceType()).isEqualTo("PAID");
        assertThat(item.getPrice()).isEqualByComparingTo(BigDecimal.valueOf(1_500_000));
        assertThat(item.getSalePrice()).isEqualByComparingTo(BigDecimal.valueOf(1_200_000));
        assertThat(item.getEnrolledCount()).isEqualTo(7);
    }

    @Test
    @DisplayName("course detail includes enrolled count for course detail sidebar")
    void getCourseByIdIncludesEnrolledCount() {
        UserJpaEntity teacher = mock(UserJpaEntity.class);
        when(teacher.getFullName()).thenReturn("Teacher Name");

        when(courseRepository.findByIdWithContent(approvedPaidCourse.getId())).thenReturn(Optional.of(approvedPaidCourse));
        when(userJpaRepository.findById(teacherId)).thenReturn(Optional.of(teacher));
        when(enrollmentJpaRepository.countTotalByCourseIds(List.of(approvedPaidCourse.getId()))).thenReturn(7L);

        var response = controller.getCourseById(approvedPaidCourse.getId());
        var detail = response.getBody().getData();

        assertThat(detail.getTeacherName()).isEqualTo("Teacher Name");
        assertThat(detail.getEnrolledCount()).isEqualTo(7);
        assertThat(detail.getPrice()).isEqualByComparingTo(BigDecimal.valueOf(1_500_000));
        assertThat(detail.getSalePrice()).isEqualByComparingTo(BigDecimal.valueOf(1_200_000));
        assertThat(detail.getDeliveryMode()).isEqualTo("SELF_PACED");
    }
}
