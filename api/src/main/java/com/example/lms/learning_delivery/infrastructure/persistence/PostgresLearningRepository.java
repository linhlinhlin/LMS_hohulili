package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.repo_port.LearningRepository;
import com.example.lms.entity.User;
import com.example.lms.repository.UserRepository; // Utilizing existing legacy repo for User
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PostgresLearningRepository implements LearningRepository {

    private final JpaClassRepository jpaClassRepository;
    private final JpaEnrollmentRepository jpaEnrollmentRepository;
    private final UserRepository userRepository; // Legacy repo

    @Override
    public LearningClass saveClass(LearningClass clazz) {
        return jpaClassRepository.save(clazz);
    }

    @Override
    public Optional<LearningClass> findClassById(UUID id) {
        return jpaClassRepository.findById(id);
    }

    @Override
    public Optional<LearningClass> findClassByCode(String code) {
        return jpaClassRepository.findByCode(code);
    }

    @Override
    public Enrollment saveEnrollment(Enrollment enrollment) {
        return jpaEnrollmentRepository.save(enrollment);
    }

    @Override
    public Optional<Enrollment> findEnrollmentById(UUID id) {
        return jpaEnrollmentRepository.findById(id);
    }

    @Override
    public Optional<Enrollment> findEnrollmentByStudentAndClass(UUID studentId, UUID classId) {
        return jpaEnrollmentRepository.findByStudentIdAndLearningClassId(studentId, classId);
    }

    @Override
    public Optional<User> findStudentByEmail(String email) {
        return userRepository.findByEmail(email);
    }
}
