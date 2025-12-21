package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.application.dto.CreateCourseCommand;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.ValidationException;
import com.example.lms.shared.infrastructure.event.DomainEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CreateCourseUseCase Tests")
class CreateCourseUseCaseTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private DomainEventPublisher eventPublisher;

    @InjectMocks
    private CreateCourseUseCase useCase;

    private UUID teacherId;
    private CreateCourseCommand validCommand;

    @BeforeEach
    void setUp() {
        teacherId = UUID.randomUUID();
        validCommand = new CreateCourseCommand(
            "COURSE001",
            "Introduction to Java",
            "Learn Java programming basics",
            teacherId
        );
    }

    @Test
    @DisplayName("Should create course successfully with basic info")
    void shouldCreateCourseSuccessfully() {
        // Given
        when(courseRepository.existsByCode(any(CourseCode.class))).thenReturn(false);
        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> {
            Course c = invocation.getArgument(0);
            return c;
        });

        // When
        CourseResponse response = useCase.execute(validCommand);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.code()).isEqualTo("COURSE001");
        assertThat(response.title()).isEqualTo("Introduction to Java");
        assertThat(response.description()).isEqualTo("Learn Java programming basics");
        assertThat(response.teacherId()).isEqualTo(teacherId);
        assertThat(response.status()).isEqualTo("DRAFT");
        assertThat(response.editable()).isTrue();

        verify(courseRepository).save(any(Course.class));
    }

    @Test
    @DisplayName("Should throw exception when course code already exists")
    void shouldThrowExceptionWhenCodeExists() {
        // Given
        when(courseRepository.existsByCode(any(CourseCode.class))).thenReturn(true);

        // When/Then
        assertThatThrownBy(() -> useCase.execute(validCommand))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("Mã khóa học đã tồn tại");

        verify(courseRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should create course with all optional fields")
    void shouldCreateCourseWithAllOptionalFields() {
        // Given
        CreateCourseCommand fullCommand = new CreateCourseCommand(
            "COURSE002",
            "Advanced Java",
            "Advanced Java programming",
            teacherId,
            UUID.randomUUID(), // categoryId
            Set.of("java", "programming"), // tags
            "Welcome to the course!", // welcomeMessage
            "Course information here", // courseInformation
            "Benefits of this course", // benefits
            "https://video.url/intro", // introVideoUrl
            3, // credits
            "PUBLIC", // visibility
            "PAID", // priceType
            new BigDecimal("99.99"), // price
            new BigDecimal("79.99") // salePrice
        );

        when(courseRepository.existsByCode(any(CourseCode.class))).thenReturn(false);
        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        CourseResponse response = useCase.execute(fullCommand);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.code()).isEqualTo("COURSE002");
        assertThat(response.categoryId()).isNotNull();
        assertThat(response.tags()).containsExactlyInAnyOrder("java", "programming");
        assertThat(response.welcomeMessage()).isEqualTo("Welcome to the course!");
        assertThat(response.credits()).isEqualTo(3);
        assertThat(response.visibility()).isEqualTo("PUBLIC");
        assertThat(response.priceType()).isEqualTo("PAID");
        assertThat(response.price()).isEqualByComparingTo(new BigDecimal("99.99"));
        assertThat(response.salePrice()).isEqualByComparingTo(new BigDecimal("79.99"));
    }

    @Test
    @DisplayName("Should default to FREE price type when not specified")
    void shouldDefaultToFreePriceType() {
        // Given
        when(courseRepository.existsByCode(any(CourseCode.class))).thenReturn(false);
        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        CourseResponse response = useCase.execute(validCommand);

        // Then
        assertThat(response.priceType()).isEqualTo("FREE");
        assertThat(response.price()).isNull();
    }

    @Test
    @DisplayName("Should default to PUBLIC visibility when not specified")
    void shouldDefaultToPublicVisibility() {
        // Given
        when(courseRepository.existsByCode(any(CourseCode.class))).thenReturn(false);
        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        CourseResponse response = useCase.execute(validCommand);

        // Then
        assertThat(response.visibility()).isEqualTo("PUBLIC");
    }
}
