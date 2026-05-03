package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.application.dto.ClassStudentResponse;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.domain.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Returns the class roster enriched with student profile fields.
 *
 * Pattern reference: Canvas People, Coursera Roster — denormalize name + email
 * onto the enrollment so the drawer renders in one round-trip. Batch user
 * lookup avoids the N+1 trap when classes have hundreds of enrollments.
 */
@Service
@RequiredArgsConstructor
public class GetClassStudentsUseCase {

    private final LearningClassRepository classRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserJpaRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<ClassStudentResponse> execute(UUID classId, Pageable pageable) {
        LearningClass learningClass = classRepository.findById(classId)
                .orElseThrow(() -> new EntityNotFoundException("Lớp học", classId));

        Page<Enrollment> enrollments = enrollmentRepository.findByClassId(classId, pageable);

        var studentIds = enrollments.getContent().stream()
                .map(Enrollment::getStudentId)
                .collect(Collectors.toSet());

        Map<UUID, UserJpaEntity> usersById = studentIds.isEmpty()
                ? Map.of()
                : userRepository.findAllById(studentIds).stream()
                        .collect(Collectors.toMap(UserJpaEntity::getId, u -> u));

        return PageResponse.from(enrollments, enrollment -> toResponse(enrollment, usersById));
    }

    private ClassStudentResponse toResponse(Enrollment enrollment, Map<UUID, UserJpaEntity> usersById) {
        UserJpaEntity student = usersById.get(enrollment.getStudentId());
        return ClassStudentResponse.of(
                enrollment.getId(),
                enrollment.getStudentId(),
                student != null ? student.getFullName() : null,
                student != null ? student.getEmail() : null,
                enrollment.getStatus() != null ? enrollment.getStatus().name() : null,
                enrollment.getCompletionPercent(),
                enrollment.getEnrolledAt(),
                enrollment.getLastAccessedAt()
        );
    }
}
