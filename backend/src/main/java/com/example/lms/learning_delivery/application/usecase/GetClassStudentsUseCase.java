package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.dto.EnrollmentResponse;
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

import java.util.UUID;

/**
 * Use case for getting students enrolled in a class.
 */
@Service
@RequiredArgsConstructor
public class GetClassStudentsUseCase {

    private final LearningClassRepository classRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Transactional(readOnly = true)
    public PageResponse<EnrollmentResponse> execute(UUID classId, Pageable pageable) {
        // Verify class exists
        LearningClass learningClass = classRepository.findById(classId)
                .orElseThrow(() -> new EntityNotFoundException("Lớp học", classId));

        // Get enrollments
        Page<Enrollment> enrollments = enrollmentRepository.findByClassId(classId, pageable);

        return PageResponse.from(enrollments, EnrollmentResponse::from);
    }
}
