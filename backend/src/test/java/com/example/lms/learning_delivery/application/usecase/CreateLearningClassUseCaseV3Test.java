package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.infrastructure.persistence.mapper.LearningClassEntityMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
    private LearningClassEntityMapper mapper;

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
            30
        );
    }

    @Nested
    @DisplayName("Happy Path Tests")
    class HappyPathTests {

        @Test
        @DisplayName("Should create learning class successfully")
        void shouldCreateLearningClassSuccessfully() {
            // Given
            when(mapper.toEntity(any(), any(), any(), any(), any(), any(), any())).thenReturn(null);

            // When
            UUID classId = useCase.execute(validCommand);

            // Then
            assertThat(classId).isNotNull();
        }

        @Test
        @DisplayName("Should call mapper with correct parameters")
        void shouldCallMapperWithCorrectParams() {
            // Given
            when(mapper.toEntity(any(), any(), any(), any(), any(), any(), any())).thenReturn(null);

            // When
            useCase.execute(validCommand);

            // Then
            verify(mapper).toEntity(
                eq(courseId),
                eq(teacherId),
                eq("CLASS-001"),
                eq("Maritime Safety 2025"),
                any(Instant.class),
                any(Instant.class),
                eq(30)
            );
        }

        @Test
        @DisplayName("Should accept null maxStudents")
        void shouldAcceptNullMaxStudents() {
            // Given
            CreateLearningClassUseCaseV3.CreateClassCommand commandWithNullMax = 
                new CreateLearningClassUseCaseV3.CreateClassCommand(
                    courseId, teacherId, "CLASS-002", "Test Class", 
                    Instant.now(), Instant.now().plusSeconds(86400), null
                );
            when(mapper.toEntity(any(), any(), any(), any(), any(), any(), any())).thenReturn(null);

            // When
            UUID classId = useCase.execute(commandWithNullMax);

            // Then
            assertThat(classId).isNotNull();
        }
    }
}
