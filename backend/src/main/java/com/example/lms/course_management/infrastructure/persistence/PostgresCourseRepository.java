package com.example.lms.course_management.infrastructure.persistence;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_management.domain.model.Course;
import com.example.lms.course_management.domain.model.CourseVersion;
import com.example.lms.course_management.domain.repo_port.CourseRepository;
import com.example.lms.course_management.infrastructure.persistence.mapper.CourseMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Infrastructure repository implementing CourseRepository domain port.
 * 
 * DDD Infrastructure Layer pattern:
 * - Delegates to JPA repository (CourseJpaEntity)
 * - Uses CourseMapper to convert between domain and JPA entities
 * - Domain layer remains framework-free
 */
@Component
public class PostgresCourseRepository implements CourseRepository {

    private final JpaCourseManagementRepository jpaCourseRepository;
    private final JpaCourseVersionRepository jpaCourseVersionRepository;
    private final CourseMapper courseMapper;

    public PostgresCourseRepository(
            JpaCourseManagementRepository jpaCourseRepository,
            JpaCourseVersionRepository jpaCourseVersionRepository,
            CourseMapper courseMapper) {
        this.jpaCourseRepository = jpaCourseRepository;
        this.jpaCourseVersionRepository = jpaCourseVersionRepository;
        this.courseMapper = courseMapper;
    }

    @Override
    public Course save(Course course) {
        CourseJpaEntity entity = courseMapper.toEntity(course);
        CourseJpaEntity saved = jpaCourseRepository.save(entity);
        return courseMapper.toDomain(saved);
    }

    @Override
    public Optional<Course> findById(UUID id) {
        return jpaCourseRepository.findById(id)
                .map(courseMapper::toDomain);
    }
    
    public Optional<Course> findByIdWithContent(UUID id) {
        return jpaCourseRepository.findById(id)
                .map(courseMapper::toDomain);
    }

    @Override
    public Page<Course> findByTeacherId(UUID teacherId, Pageable pageable) {
        return jpaCourseRepository.findByTeacherId(teacherId, pageable)
                .map(courseMapper::toDomain);
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
    public Optional<Course> findByChapterId(UUID chapterId) {
        // TODO: Implement via ChapterJpaRepository or join query
        return Optional.empty();
    }

    @Override
    public Optional<Course> findByLessonId(UUID lessonId) {
        // TODO: Implement via LessonJpaRepository or join query  
        return Optional.empty();
    }
    
    public Integer getNextVersionNumber(UUID courseId) {
        Integer max = jpaCourseVersionRepository.findMaxVersionByCourseId(courseId);
        return max == null ? 1 : max + 1;
    }
}
