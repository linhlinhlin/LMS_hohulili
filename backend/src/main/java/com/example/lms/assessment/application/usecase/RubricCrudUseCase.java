package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Rubric;
import com.example.lms.assessment.domain.repository.RubricRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RubricCrudUseCase {

    private final RubricRepository rubricRepository;

    @Transactional
    public Rubric create(CreateRubricCommand command) {
        log.info("Creating rubric '{}' for teacher {}", command.title(), command.teacherId());

        Rubric rubric = Rubric.create(
                command.teacherId(),
                command.title(),
                command.description(),
                command.maxPoints(),
                command.criteria()
        );

        return rubricRepository.save(rubric);
    }

    @Transactional
    public Rubric update(UUID rubricId, UUID teacherId, boolean isAdmin, UpdateRubricCommand command) {
        Rubric rubric = rubricRepository.findById(rubricId)
                .orElseThrow(() -> new EntityNotFoundException("Rubric", rubricId));

        if (!isAdmin && !rubric.getTeacherId().equals(teacherId)) {
            throw new BusinessRuleException("RUBRIC_ACCESS_DENIED", "Bạn không có quyền chỉnh sửa rubric này");
        }

        rubric.update(command.title(), command.description(), command.maxPoints(), command.criteria());
        return rubricRepository.save(rubric);
    }

    @Transactional
    public void delete(UUID rubricId, UUID teacherId, boolean isAdmin) {
        Rubric rubric = rubricRepository.findById(rubricId)
                .orElseThrow(() -> new EntityNotFoundException("Rubric", rubricId));

        if (!isAdmin && !rubric.getTeacherId().equals(teacherId)) {
            throw new BusinessRuleException("RUBRIC_ACCESS_DENIED", "Bạn không có quyền xóa rubric này");
        }

        if (rubric.isAssigned()) {
            throw new BusinessRuleException("RUBRIC_IN_USE", "Không thể xóa rubric đang được gán cho bài tập");
        }

        rubricRepository.deleteById(rubricId);
        log.info("Deleted rubric {}", rubricId);
    }

    @Transactional(readOnly = true)
    public Rubric findById(UUID rubricId) {
        return rubricRepository.findById(rubricId)
                .orElseThrow(() -> new EntityNotFoundException("Rubric", rubricId));
    }

    @Transactional(readOnly = true)
    public List<Rubric> findByTeacher(UUID teacherId) {
        return rubricRepository.findByTeacherId(teacherId);
    }

    @Transactional
    public Rubric assignToAssignment(UUID rubricId, UUID assignmentId, UUID teacherId, boolean isAdmin) {
        Rubric rubric = rubricRepository.findById(rubricId)
                .orElseThrow(() -> new EntityNotFoundException("Rubric", rubricId));

        if (!isAdmin && !rubric.getTeacherId().equals(teacherId)) {
            throw new BusinessRuleException("RUBRIC_ACCESS_DENIED", "Bạn không có quyền gán rubric này");
        }

        rubric.assignTo(assignmentId);
        return rubricRepository.save(rubric);
    }

    @Transactional(readOnly = true)
    public Rubric findByAssignment(UUID assignmentId) {
        return rubricRepository.findByAssignmentId(assignmentId)
                .orElseThrow(() -> new EntityNotFoundException("Rubric for assignment", assignmentId));
    }

    // Commands
    public record CreateRubricCommand(
            UUID teacherId,
            String title,
            String description,
            Double maxPoints,
            List<Rubric.Criterion> criteria
    ) {}

    public record UpdateRubricCommand(
            String title,
            String description,
            Double maxPoints,
            List<Rubric.Criterion> criteria
    ) {}
}
