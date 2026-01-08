package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.domain.valueobject.CourseCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of CourseRepository using Spring Data JPA.
 * This is the infrastructure adapter for the domain port.
 */
@Component
@RequiredArgsConstructor
public class CourseRepositoryImpl implements CourseRepository {

    private final JpaCourseRepository jpaRepository;

    @Override
    public Course save(Course course) {
        return jpaRepository.save(course);
    }

    @Override
    public Optional<Course> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<Course> findByIdWithContent(UUID id) {
        return jpaRepository.findByIdWithContent(id);
    }

    @Override
    public Optional<Course> findByCode(CourseCode code) {
        return jpaRepository.findByCodeValue(code.getValue());
    }

    @Override
    public boolean existsByCode(CourseCode code) {
        return jpaRepository.existsByCodeValue(code.getValue());
    }

    @Override
    public void delete(Course course) {
        jpaRepository.delete(course);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public Page<Course> findByTeacherId(UUID teacherId, Pageable pageable) {
        return jpaRepository.findByTeacherId(teacherId, pageable);
    }

    @Override
    public Page<Course> findApproved(Pageable pageable) {
        return jpaRepository.findByStatus(Course.CourseStatus.APPROVED, pageable);
    }

    @Override
    public Page<Course> findApprovedByTitleContaining(String search, Pageable pageable) {
        return jpaRepository.findByStatusAndTitleContaining(
                Course.CourseStatus.APPROVED, search, pageable);
    }

    @Override
    public Page<Course> findPending(Pageable pageable) {
        return jpaRepository.findByStatus(Course.CourseStatus.PENDING, pageable);
    }

    @Override
    public long countByTeacherId(UUID teacherId) {
        return jpaRepository.countByTeacherId(teacherId);
    }

    @Override
    public long countByStatus(Course.CourseStatus status) {
        return jpaRepository.countByStatus(status);
    }
}
