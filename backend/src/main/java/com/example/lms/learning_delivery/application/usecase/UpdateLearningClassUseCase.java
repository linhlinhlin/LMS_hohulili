package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.dto.LearningClassResponse;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.ClassTeacherJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.ClassTeacherJpaEntity;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Use case for updating a learning class.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UpdateLearningClassUseCase {

    private final LearningClassRepository classRepository;
    private final ClassTeacherJpaRepository classTeacherJpaRepository;

    public record UpdateClassCommand(
        UUID classId,
        String name,
        String code,
        UUID teacherId,
        String status,
        String scheduleType,
        String semester,
        Integer maxStudents,
        Instant startDate,
        Instant endDate
    ) {}

    @Transactional
    public LearningClassResponse execute(UpdateClassCommand command) {
        log.info("Updating learning class {}", command.classId());

        LearningClass learningClass = classRepository.findById(command.classId())
                .orElseThrow(() -> new EntityNotFoundException("Lớp học", command.classId()));

        // Update via domain behavior method
        LearningClass.ClassStatus newStatus = command.status() != null
                ? LearningClass.ClassStatus.valueOf(command.status()) : null;
        LearningClass.ScheduleType newScheduleType = command.scheduleType() != null
                ? LearningClass.ScheduleType.valueOf(command.scheduleType()) : null;
        learningClass.update(
                command.name(),
                command.code(),
                command.teacherId(),
                newStatus,
                newScheduleType,
                command.semester(),
                command.maxStudents(),
                command.startDate(),
                command.endDate()
        );

        LearningClass updated = classRepository.save(learningClass);

        // Sync class_teachers junction table when primary teacher changes
        if (command.teacherId() != null) {
            syncPrimaryTeacher(command.classId(), command.teacherId());
        }

        log.info("Learning class {} updated successfully", command.classId());

        return LearningClassResponse.from(updated);
    }

    /**
     * Keeps class_teachers table in sync when primary teacher is reassigned.
     * Steps: (1) demote/remove old PRIMARY, (2) upsert new teacher as PRIMARY.
     */
    private void syncPrimaryTeacher(UUID classId, UUID newTeacherId) {
        // Find current PRIMARY teacher
        var currentTeachers = classTeacherJpaRepository.findByClassId(classId);
        var oldPrimary = currentTeachers.stream()
                .filter(ct -> ct.getRole() == ClassTeacherJpaEntity.TeacherRole.PRIMARY)
                .findFirst();

        // Remove old PRIMARY (if different from new)
        oldPrimary.ifPresent(old -> {
            if (!old.getTeacherId().equals(newTeacherId)) {
                classTeacherJpaRepository.deleteByClassIdAndTeacherId(classId, old.getTeacherId());
            }
        });

        // Check if new teacher already exists in class_teachers
        var existing = classTeacherJpaRepository.findByClassIdAndTeacherId(classId, newTeacherId);
        if (existing.isPresent()) {
            // Upgrade CO_TEACHER → PRIMARY
            var ct = existing.get();
            if (ct.getRole() != ClassTeacherJpaEntity.TeacherRole.PRIMARY) {
                ct.setRole(ClassTeacherJpaEntity.TeacherRole.PRIMARY);
                classTeacherJpaRepository.save(ct);
            }
        } else {
            // Insert new PRIMARY
            classTeacherJpaRepository.save(ClassTeacherJpaEntity.builder()
                    .classId(classId)
                    .teacherId(newTeacherId)
                    .role(ClassTeacherJpaEntity.TeacherRole.PRIMARY)
                    .build());
        }
    }
}
