package com.example.lms.course_management.application.usecase;

import com.example.lms.course_management.application.dto.AuthoringDTOs;
import com.example.lms.course_management.application.dto.CourseDTOs;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case: Course lifecycle operations (create, update, delete, approval workflow, queries).
 *
 * Note: The following responsibilities have been extracted into dedicated use cases:
 * - {@link GetCourseDraftUseCase} - retrieving a course draft tree
 * - {@link ReorderChaptersUseCase} - reordering chapters within a course
 * - {@link ReorderLessonsUseCase} - reordering lessons within a chapter
 * - {@link UpdateLessonUseCase} - updating a single lesson
 */
@Service
@RequiredArgsConstructor
public class CourseAuthoringUseCase {

    private final CourseRepository courseRepository;
    private final GetCourseDraftUseCase getCourseDraftUseCase;

    // --- Lifecycle Methods ---

    @Transactional
    public AuthoringDTOs.CourseDraftDTO createCourse(CourseDTOs.CreateCourseRequest request, UUID teacherId) {
        if (courseRepository.existsByCodeValue(request.getCode())) {
           throw new BusinessRuleException("COURSE_CODE_EXISTS", "Course code already exists: " + request.getCode());
        }

        Course course = Course.create(
            CourseCode.of(request.getCode()),
            request.getTitle(),
            request.getDescription(),
            teacherId
        );

        Course saved = courseRepository.save(course);
        return getCourseDraftUseCase.execute(saved.getId());
    }

    @Transactional
    public void updateCourse(UUID courseId, CourseDTOs.UpdateCourseRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        if (request.getTitle() != null || request.getDescription() != null) {
            String newTitle = request.getTitle() != null ? request.getTitle() : course.getTitle();
            String newDesc = request.getDescription() != null ? request.getDescription() : course.getDescription();
            course.updateInfo(newTitle, newDesc);
        }

        if (request.getPriceType() != null || request.getPrice() != null) {
             Course.PriceType type = request.getPriceType() != null ? Course.PriceType.valueOf(request.getPriceType()) : course.getPriceType();
             course.updatePricing(type, request.getPrice(), null);
        }

        if (request.getThumbnailUrl() != null) {
            course.updateThumbnail(request.getThumbnailUrl());
        }

        courseRepository.save(course);
    }

    @Transactional
    public void deleteCourse(UUID courseId) {
        courseRepository.deleteById(courseId);
    }

    @Transactional
    public void submitForApproval(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));
        course.submitForApproval();
        courseRepository.save(course);
    }

    @Transactional
    public void cancelApproval(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));
        course.cancelApprovalRequest();
        courseRepository.save(course);
    }

    @Transactional(readOnly = true)
    public CourseDTOs.CourseReviewStatusDTO getReviewStatus(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        return CourseDTOs.CourseReviewStatusDTO.builder()
                .courseId(course.getId().toString())
                .status(course.getStatus().name())
                .reviewComment(course.getReviewComment())
                .reviewedAt(course.getReviewedAt() != null ? course.getReviewedAt().toString() : null)
                .build();
    }

    // --- Query Methods ---

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<CourseDTOs.TeacherCourseResponse> getMyCourses(UUID teacherId, org.springframework.data.domain.Pageable pageable) {
         return courseRepository.findByTeacherId(teacherId, pageable)
                 .map(this::mapToTeacherCourseResponse);
    }

    private CourseDTOs.TeacherCourseResponse mapToTeacherCourseResponse(Course course) {
        return CourseDTOs.TeacherCourseResponse.builder()
                .id(course.getId())
                .slug(course.getCode() != null ? course.getCode().getValue() : "")
                .title(course.getTitle())
                .status(course.getStatus().name())
                .price(course.getPrice())
                .sectionCount(0)
                .lessonCount(0)
                .description(course.getDescription())
                .thumbnail(course.getThumbnailUrl())
                .studentsCount(0)
                .averageRating(0.0)
                .createdAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                .updatedAt(course.getUpdatedAt() != null ? course.getUpdatedAt().toString() : null)
                .build();
    }
}
