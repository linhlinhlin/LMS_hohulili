package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.User;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.LearningClassRepository;
import com.example.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClassService {

    private final LearningClassRepository classRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final com.example.lms.course_management.infrastructure.persistence.JpaCourseVersionRepository courseVersionRepository;

    @Transactional(readOnly = true)
    public List<LearningClass> getOpenClasses(UUID courseId) {
        return classRepository.findByCourseIdAndStatus(courseId, LearningClass.ClassStatus.OPEN);
    }
    
    @Transactional(readOnly = true)
    public List<LearningClass> getAllClassesByCourse(UUID courseId) {
        return classRepository.findByCourseIdAndStatus(courseId, LearningClass.ClassStatus.OPEN);
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<com.example.lms.dto.ClassSummaryDTO> getClassesWithFilter(
            UUID courseId, String search, LearningClass.ClassStatus status, String semester, org.springframework.data.domain.Pageable pageable) {
        
        String searchPattern = null;
        if (search != null && !search.trim().isEmpty()) {
            searchPattern = "%" + search.trim() + "%";
        }
        
        return classRepository.searchClasses(courseId, searchPattern, status, semester, pageable);
    }

    @Transactional
    public LearningClass createDefaultClassForCourse(Course course) {
        String code = "DEF-" + course.getId().toString().substring(0, 8);
        
        // Check existential to avoid duplicates
        return classRepository.findDefaultClassByCourseId(course.getId())
                .orElseGet(() -> {
                    UUID versionId = getLatestCourseVersionId(course.getId());
                    LearningClass defaultClass = LearningClass.builder()
                        .course(course)
                        .courseVersionId(versionId)
                        .teacher(course.getTeacher())
                        .name("Lớp mặc định")
                        .code(code)
                        .maxStudents(9999)
                        .status(LearningClass.ClassStatus.OPEN)
                        .build();
                    return classRepository.save(defaultClass);
                });
    }

    @Transactional
    public LearningClass createClass(UUID courseId, String name, Integer maxStudents, 
                                     Instant startDate, Instant endDate, 
                                     LearningClass.ScheduleType scheduleType, String semester,
                                     UUID teacherId) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new RuntimeException("Course not found"));

        validateClassDates(startDate, endDate);
        validateSemester(scheduleType, semester);
        
        UUID versionId = getLatestCourseVersionId(courseId);

        // Determine teacher: if provided, use it; else default to course owner
        User classTeacher = course.getTeacher();
        if (teacherId != null) {
            classTeacher = userRepository.findById(teacherId)
                    .orElseThrow(() -> new IllegalArgumentException("Teacher not found with ID: " + teacherId));
            // Optional: Check if user has TEACHER role
            if (classTeacher.getRole() != User.Role.TEACHER && classTeacher.getRole() != User.Role.ADMIN) {
                 throw new IllegalArgumentException("Selected user is not a teacher");
            }
        }

        LearningClass newClass = LearningClass.builder()
            .course(course)
            .courseVersionId(versionId)
            .teacher(classTeacher)
            .name(name)
            .code("CLS-" + UUID.randomUUID().toString().substring(0, 8))
            .maxStudents(maxStudents != null ? maxStudents : 50)
            .startDate(startDate)
            .endDate(endDate)
            .scheduleType(scheduleType)
            .semester(scheduleType == LearningClass.ScheduleType.SEMESTER ? semester : null)
            .status(LearningClass.ClassStatus.OPEN)
            .build();
            
        return classRepository.save(newClass);
    }
    
    private UUID getLatestCourseVersionId(UUID courseId) {
        Integer maxVersion = courseVersionRepository.findMaxVersionByCourseId(courseId);
        if (maxVersion == null) {
            // Fallback for development/testing: If no version exists, allow creating a class with null version.
            // This enables teachers to create classes for draft courses.
            return null;
        }
        return courseVersionRepository.findByCourseIdAndVersionNumber(courseId, maxVersion)
                .map(com.example.lms.course_management.domain.model.CourseVersion::getId)
                .orElse(null);
    }

    @Transactional
    public LearningClass updateClass(UUID classId, String name, Integer maxStudents, 
                                     Instant startDate, Instant endDate,
                                     LearningClass.ScheduleType scheduleType, String semester) {
        LearningClass clazz = classRepository.findById(classId)
            .orElseThrow(() -> new RuntimeException("Class not found"));
            
        validateClassDates(startDate, endDate);
        validateSemester(scheduleType, semester);

        clazz.setName(name);
        clazz.setMaxStudents(maxStudents);
        clazz.setStartDate(startDate);
        clazz.setEndDate(endDate);
        clazz.setScheduleType(scheduleType);
        clazz.setSemester(scheduleType == LearningClass.ScheduleType.SEMESTER ? semester : null);
        
        return classRepository.save(clazz);
    }

    @Transactional
    public void deleteClass(UUID classId) {
        LearningClass clazz = classRepository.findById(classId)
            .orElseThrow(() -> new RuntimeException("Class not found"));
        // Soft enable
        clazz.setStatus(LearningClass.ClassStatus.CANCELLED);
        classRepository.save(clazz);
    }

    private void validateClassDates(Instant startDate, Instant endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date cannot be after end date");
        }
    }

    private void validateSemester(LearningClass.ScheduleType type, String semester) {
        if (type == LearningClass.ScheduleType.SEMESTER && (semester == null || semester.trim().isEmpty())) {
            throw new IllegalArgumentException("Semester name is required for Semester schedule type");
        }
    }
}
