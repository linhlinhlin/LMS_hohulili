package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.dto.EnrollmentResponse;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Use case for getting enrollment progress.
 */
@Service
@RequiredArgsConstructor
public class GetEnrollmentProgressUseCase {

    private final EnrollmentRepository enrollmentRepository;

    @Transactional(readOnly = true)
    public EnrollmentResponse execute(UUID enrollmentId) {
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new EntityNotFoundException("Enrollment", enrollmentId));

        return EnrollmentResponse.from(enrollment);
    }

    @Transactional(readOnly = true)
    public EnrollmentResponse executeByStudentAndClass(UUID studentId, UUID classId) {
        Enrollment enrollment = enrollmentRepository.findByStudentIdAndClassId(studentId, classId)
                .orElseThrow(() -> new EntityNotFoundException("Enrollment", 
                    "student=" + studentId + ", class=" + classId));

        return EnrollmentResponse.from(enrollment);
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> executeByStudent(UUID studentId) {
        List<Enrollment> enrollments = enrollmentRepository.findActiveByStudentId(studentId);
        return enrollments.stream()
                .map(EnrollmentResponse::from)
                .collect(Collectors.toList());
    }
}
