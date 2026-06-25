package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.AuthoringDTOs;
import com.example.lms.course_authoring.application.dto.CourseDTOs;
import com.example.lms.course_authoring.application.service.CourseDeletionCleanupService;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.model.CourseCategory;
import com.example.lms.course_authoring.domain.repository.ChapterRepositoryPort;
import com.example.lms.course_authoring.domain.repository.CourseCategoryRepository;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseReviewEventJpaRepository;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CourseAuthoringUseCase Tests")
class CourseAuthoringUseCaseTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private CourseCategoryRepository courseCategoryRepository;

    @Mock
    private ChapterRepositoryPort chapterRepository;

    @Mock
    private GetCourseDraftUseCase getCourseDraftUseCase;

    @Mock
    private CourseReviewEventJpaRepository reviewEventRepository;

    @Mock
    private CourseDeletionCleanupService courseDeletionCleanupService;

    @InjectMocks
    private CourseAuthoringUseCase useCase;

    private UUID teacherId;
    private UUID categoryId;
    private CourseCategory rootCategory;

    @BeforeEach
    void setUp() {
        teacherId = UUID.randomUUID();
        categoryId = UUID.randomUUID();
        rootCategory = CourseCategory.reconstitute(
                categoryId,
                null,
                "ENG",
                "Engine",
                "engine",
                "ENG",
                "Root category",
                null,
                0,
                true,
                Instant.now(),
                Instant.now()
        );
    }

    @Test
    @DisplayName("Should persist initial paid pricing from create request")
    void shouldPersistInitialPaidPricingFromCreateRequest() {
        UUID organizationId = UUID.randomUUID();
        CourseDTOs.CreateCourseRequest request = CourseDTOs.CreateCourseRequest.builder()
                .categoryId(categoryId)
                .title("Paid course")
                .description("Course description")
                .deliveryMode("SELF_PACED")
                .priceType("PAID")
                .price(new BigDecimal("500000"))
                .salePrice(new BigDecimal("400000"))
                .build();

        AuthoringDTOs.CourseDraftDTO draft = AuthoringDTOs.CourseDraftDTO.builder()
                .id(UUID.randomUUID())
                .title("Paid course")
                .priceType("PAID")
                .price(new BigDecimal("500000"))
                .salePrice(new BigDecimal("400000"))
                .build();

        when(courseCategoryRepository.findById(categoryId)).thenReturn(Optional.of(rootCategory));
        when(courseRepository.findMaxSequenceNumberByPrefix("ENG")).thenReturn(213);
        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(getCourseDraftUseCase.execute(any(UUID.class))).thenReturn(draft);

        AuthoringDTOs.CourseDraftDTO result = useCase.createCourse(request, teacherId, organizationId);

        ArgumentCaptor<Course> courseCaptor = ArgumentCaptor.forClass(Course.class);
        verify(courseRepository).save(courseCaptor.capture());
        Course savedCourse = courseCaptor.getValue();

        assertThat(savedCourse.getPriceType()).isEqualTo(Course.PriceType.PAID);
        assertThat(savedCourse.getOrganizationId()).isEqualTo(organizationId);
        assertThat(savedCourse.getPrice()).isEqualByComparingTo("500000");
        assertThat(savedCourse.getSalePrice()).isEqualByComparingTo("400000");
        assertThat(result.getPriceType()).isEqualTo("PAID");
        assertThat(result.getPrice()).isEqualByComparingTo("500000");
        assertThat(result.getSalePrice()).isEqualByComparingTo("400000");
    }

    @Test
    @DisplayName("Should reject paid create request without valid base price")
    void shouldRejectPaidCreateRequestWithoutValidBasePrice() {
        CourseDTOs.CreateCourseRequest request = CourseDTOs.CreateCourseRequest.builder()
                .categoryId(categoryId)
                .title("Broken paid course")
                .description("Course description")
                .priceType("PAID")
                .salePrice(new BigDecimal("400000"))
                .build();

        when(courseCategoryRepository.findById(categoryId)).thenReturn(Optional.of(rootCategory));
        when(courseRepository.findMaxSequenceNumberByPrefix("ENG")).thenReturn(213);

        assertThatThrownBy(() -> useCase.createCourse(request, teacherId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("0");
    }

    @Test
    @DisplayName("Should cleanup course dependents before deleting course")
    void shouldCleanupDependentsBeforeDeletingCourse() {
        UUID courseId = UUID.randomUUID();
        when(courseRepository.existsById(courseId)).thenReturn(true);

        useCase.deleteCourse(courseId);

        var ordered = inOrder(courseDeletionCleanupService, courseRepository);
        ordered.verify(courseDeletionCleanupService).cleanupBeforeDelete(courseId);
        ordered.verify(courseRepository).deleteById(courseId);
    }

    @Test
    @DisplayName("Should fail fast when deleting missing course")
    void shouldFailFastWhenDeletingMissingCourse() {
        UUID courseId = UUID.randomUUID();
        when(courseRepository.existsById(courseId)).thenReturn(false);

        assertThatThrownBy(() -> useCase.deleteCourse(courseId))
                .isInstanceOf(EntityNotFoundException.class);

        verify(courseDeletionCleanupService, never()).cleanupBeforeDelete(any());
        verify(courseRepository, never()).deleteById(any());
    }
}
