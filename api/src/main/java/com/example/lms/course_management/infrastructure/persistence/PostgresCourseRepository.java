package com.example.lms.course_management.infrastructure.persistence;

import com.example.lms.course_management.domain.model.Course;
import com.example.lms.course_management.domain.model.CourseVersion;
import com.example.lms.course_management.domain.repo_port.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PostgresCourseRepository implements CourseRepository {

    private final JpaCourseRepository jpaCourseRepository;
    private final JpaCourseVersionRepository jpaCourseVersionRepository;

    @Override
    public Course save(Course course) {
        return jpaCourseRepository.save(course);
    }

    @Override
    public Optional<Course> findById(UUID id) {
        // Default findById (lazy loading)
        return jpaCourseRepository.findById(id);
    }
    
    public Optional<Course> findByIdWithContent(UUID id) {
        return jpaCourseRepository.findByIdWithContent(id);
    }

    @Override
    public Page<Course> findByTeacherId(UUID teacherId, Pageable pageable) {
        return jpaCourseRepository.findByTeacherId(teacherId, pageable);
    }

    @Override
    public boolean existsByCode(String code) {
        return jpaCourseRepository.existsByCode(code);
    }

    @Override
    public CourseVersion saveVersion(CourseVersion version) {
        return jpaCourseVersionRepository.save(version);
    }

    @Override
    public Optional<CourseVersion> findVersionByCourseIdAndVersionNumber(UUID courseId, Integer versionNumber) {
        return jpaCourseVersionRepository.findByCourseIdAndVersionNumber(courseId, versionNumber);
    }

    @Override
    public Optional<CourseVersion> findVersionById(UUID id) {
        return jpaCourseVersionRepository.findById(id);
    }

    @Override
    public java.util.Optional<Course> findByChapterId(UUID chapterId) {
        return jpaCourseRepository.findByChapterId(chapterId);
    }

    @Override
    public java.util.Optional<Course> findByLessonId(UUID lessonId) {
        return jpaCourseRepository.findByLessonId(lessonId);
    }
    
    public Integer getNextVersionNumber(UUID courseId) {
        Integer max = jpaCourseVersionRepository.findMaxVersionByCourseId(courseId);
        return max == null ? 1 : max + 1;
    }
}
