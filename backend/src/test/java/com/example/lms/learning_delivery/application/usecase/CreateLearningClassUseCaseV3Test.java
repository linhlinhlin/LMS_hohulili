package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for CreateLearningClassUseCaseV3.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("CreateLearningClassUseCaseV3 Tests")
class CreateLearningClassUseCaseV3Test {

    @Mock
    private LearningClassRepository classRepository;

    @InjectMocks
    private CreateLearningClassUseCaseV3 useCase;

    private CreateLearningClassUseCaseV3.CreateClassCommand validCommand;
    private UUID courseId;
    private UUID teacherId;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        teacherId = UUID.randomUUID();

        validCommand = new CreateLearningClassUseCaseV3.CreateClassCommand(
            courseId,
            teacherId,
            "CLASS-001",
            "Maritime Safety 2025",
            Instant.now(),
            Instant.now().plusSeconds(86400 * 30), // 30 days
            30,
            "SEMESTER",
            "HK1-2025"
        );
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should create learning class successfully")
        void shouldCreateLearningClassSuccessfully() {
            // Given
            when(classRepository.existsByCode("CLASS-001")).thenReturn(false);
            when(classRepository.save(any(LearningClass.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            UUID classId = useCase.execute(validCommand);

            // Then
            assertThat(classId).isNotNull();
            verify(classRepository).save(any(LearningClass.class));
        }

        @Test
        @DisplayName("Should save class with correct parameters")
        void shouldSaveClassWithCorrectParams() {
            // Given
            when(classRepository.existsByCode("CLASS-001")).thenReturn(false);
            ArgumentCaptor<LearningClass> captor = ArgumentCaptor.forClass(LearningClass.class);
            when(classRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

            // When
            useCase.execute(validCommand);

            // Then
            LearningClass saved = captor.getValue();
            assertThat(saved.getCourseId()).isEqualTo(courseId);
            assertThat(saved.getTeacherId()).isEqualTo(teacherId);
            assertThat(saved.getCode()).isEqualTo("CLASS-001");
            assertThat(saved.getName()).isEqualTo("Maritime Safety 2025");
            assertThat(saved.getMaxStudents()).isEqualTo(30);
            assertThat(saved.getScheduleType()).isEqualTo(LearningClass.ScheduleType.SEMESTER);
            assertThat(saved.getSemester()).isEqualTo("HK1-2025");
        }

        @Test
        @DisplayName("Should accept null maxStudents and default to 50")
        void shouldAcceptNullMaxStudents() {
            // Given
            CreateLearningClassUseCaseV3.CreateClassCommand commandWithNullMax =
                new CreateLearningClassUseCaseV3.CreateClassCommand(
                    courseId, teacherId, "CLASS-002", "Test Class",
                    Instant.now(), Instant.now().plusSeconds(86400), null, null, null
                );
            when(classRepository.existsByCode("CLASS-002")).thenReturn(false);
            ArgumentCaptor<LearningClass> captor = ArgumentCaptor.forClass(LearningClass.class);
            when(classRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

            // When
            UUID classId = useCase.execute(commandWithNullMax);

            // Then
            assertThat(classId).isNotNull();
            assertThat(captor.getValue().getMaxStudents()).isEqualTo(50); // Default value
        }
    }

    @Nested
    @DisplayName("Validation Tests")
    class ValidationTests {

        @Test
        @DisplayName("Should throw when class code already exists")
        void shouldThrowWhenCodeExists() {
            // Given
            when(classRepository.existsByCode("CLASS-001")).thenReturn(true);

            // When/Then
            assertThatThrownBy(() -> useCase.execute(validCommand))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("CLASS-001")
                .satisfies(ex -> {
                    BusinessRuleException bre = (BusinessRuleException) ex;
                    assertThat(bre.getRuleName()).isEqualTo("CLASS_CODE_EXISTS");
                });
        }
    }
}
