package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Rubric;
import com.example.lms.assessment.domain.repository.RubricRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RubricCrudUseCase Tests")
class RubricCrudUseCaseTest {

    @Mock
    private RubricRepository rubricRepository;

    @InjectMocks
    private RubricCrudUseCase useCase;

    private UUID teacherId;
    private UUID rubricId;
    private UUID assignmentId;

    @BeforeEach
    void setUp() {
        teacherId = UUID.randomUUID();
        rubricId = UUID.randomUUID();
        assignmentId = UUID.randomUUID();
    }

    private List<Rubric.Criterion> sampleCriteria() {
        return List.of(
                new Rubric.Criterion("Kiến thức", "Hiểu biết lý thuyết", 40.0,
                        List.of(new Rubric.Level("Xuất sắc", "", 100.0),
                                new Rubric.Level("Tốt", "", 75.0))),
                new Rubric.Criterion("Kỹ năng", "Thực hành", 60.0,
                        List.of(new Rubric.Level("Tốt", "", 100.0)))
        );
    }

    @Test
    @DisplayName("Should create rubric successfully")
    void shouldCreateRubric() {
        var command = new RubricCrudUseCase.CreateRubricCommand(
                teacherId, "Test Rubric", "Description", 100.0, sampleCriteria());

        when(rubricRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Rubric result = useCase.create(command);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Test Rubric");
        assertThat(result.getTeacherId()).isEqualTo(teacherId);
        assertThat(result.getCriteria()).hasSize(2);
        assertThat(result.isAssigned()).isFalse();
        verify(rubricRepository).save(any());
    }

    @Test
    @DisplayName("Should update rubric by owner")
    void shouldUpdateRubric() {
        Rubric existing = Rubric.create(teacherId, "Old Title", "Old Desc", 100.0, sampleCriteria());

        when(rubricRepository.findById(any())).thenReturn(Optional.of(existing));
        when(rubricRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var command = new RubricCrudUseCase.UpdateRubricCommand(
                "New Title", "New Desc", 100.0, sampleCriteria());

        Rubric result = useCase.update(existing.getId(), teacherId, false, command);

        assertThat(result.getTitle()).isEqualTo("New Title");
        assertThat(result.getDescription()).isEqualTo("New Desc");
    }

    @Test
    @DisplayName("Should delete unassigned rubric")
    void shouldDeleteUnassignedRubric() {
        Rubric existing = Rubric.create(teacherId, "Test", "Desc", 100.0, sampleCriteria());

        when(rubricRepository.findById(any())).thenReturn(Optional.of(existing));

        useCase.delete(existing.getId(), teacherId, false);

        verify(rubricRepository).deleteById(existing.getId());
    }

    @Test
    @DisplayName("Should find rubrics by teacher")
    void shouldFindByTeacher() {
        List<Rubric> rubrics = List.of(
                Rubric.create(teacherId, "Rubric 1", "", 100.0, sampleCriteria()),
                Rubric.create(teacherId, "Rubric 2", "", 100.0, sampleCriteria())
        );

        when(rubricRepository.findByTeacherId(teacherId)).thenReturn(rubrics);

        List<Rubric> result = useCase.findByTeacher(teacherId);

        assertThat(result).hasSize(2);
    }

    @Test
    @DisplayName("Should assign rubric to assignment")
    void shouldAssignToAssignment() {
        Rubric existing = Rubric.create(teacherId, "Test", "Desc", 100.0, sampleCriteria());

        when(rubricRepository.findById(any())).thenReturn(Optional.of(existing));
        when(rubricRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Rubric result = useCase.assignToAssignment(existing.getId(), assignmentId, teacherId, false);

        assertThat(result.isAssigned()).isTrue();
        assertThat(result.getAssignmentId()).isEqualTo(assignmentId);
    }

    @Test
    @DisplayName("Should reject delete when rubric is assigned")
    void shouldRejectDeleteWhenAssigned() {
        Rubric existing = Rubric.create(teacherId, "Test", "Desc", 100.0, sampleCriteria());
        existing.assignTo(assignmentId);

        when(rubricRepository.findById(any())).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> useCase.delete(existing.getId(), teacherId, false))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("đang được gán");
    }

    @Test
    @DisplayName("Should reject update by non-owner non-admin")
    void shouldRejectUpdateByNonOwner() {
        UUID otherTeacherId = UUID.randomUUID();
        Rubric existing = Rubric.create(teacherId, "Test", "Desc", 100.0, sampleCriteria());

        when(rubricRepository.findById(any())).thenReturn(Optional.of(existing));

        var command = new RubricCrudUseCase.UpdateRubricCommand(
                "New Title", "New Desc", 100.0, sampleCriteria());

        assertThatThrownBy(() -> useCase.update(existing.getId(), otherTeacherId, false, command))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("quyền");
    }

    @Test
    @DisplayName("Should throw when rubric not found")
    void shouldThrowWhenNotFound() {
        when(rubricRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.findById(rubricId))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
