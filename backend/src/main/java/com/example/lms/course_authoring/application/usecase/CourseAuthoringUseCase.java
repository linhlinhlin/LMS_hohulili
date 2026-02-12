package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.AuthoringDTOs;
import com.example.lms.course_authoring.application.dto.CourseDTOs;
import com.example.lms.course_authoring.domain.model.Category;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CategoryRepository;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case: Course lifecycle operations (create, update, delete, approval workflow, queries).
 */
@Service
@RequiredArgsConstructor
public class CourseAuthoringUseCase {

    private final CourseRepository courseRepository;
    private final CategoryRepository categoryRepository;
    private final GetCourseDraftUseCase getCourseDraftUseCase;

    private static final int MAX_CODE_RETRY = 3;

    // --- Lifecycle Methods ---

    @Transactional
    public AuthoringDTOs.CourseDraftDTO createCourse(CourseDTOs.CreateCourseRequest request, UUID teacherId) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new EntityNotFoundException("Danh mục", request.getCategoryId()));

        String prefix = category.prefix();

        for (int attempt = 0; attempt < MAX_CODE_RETRY; attempt++) {
            int maxSeq = courseRepository.findMaxSequenceNumberByPrefix(prefix);
            String code = String.format("%s-%03d", prefix, maxSeq + 1);

            Course course = Course.create(
                CourseCode.of(code),
                request.getTitle(),
                request.getDescription(),
                teacherId
            );
            course.updateCategory(request.getCategoryId());

            // Set delivery mode if specified
            if (request.getDeliveryMode() != null && !request.getDeliveryMode().isBlank()) {
                try {
                    course.updateDeliveryMode(Course.DeliveryMode.valueOf(request.getDeliveryMode().toUpperCase()));
                } catch (IllegalArgumentException ignored) {
                    // Default SELF_PACED is already set
                }
            }

            try {
                Course saved = courseRepository.save(course);
                return getCourseDraftUseCase.execute(saved.getId());
            } catch (DataIntegrityViolationException e) {
                if (attempt == MAX_CODE_RETRY - 1) {
                    throw new BusinessRuleException("COURSE_CODE_GENERATION_FAILED",
                            "Không thể tạo mã khóa học sau " + MAX_CODE_RETRY + " lần thử");
                }
            }
        }

        throw new BusinessRuleException("COURSE_CODE_GENERATION_FAILED",
                "Không thể tạo mã khóa học");
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
        String categoryName = course.getCategoryId() != null
                ? categoryRepository.findById(course.getCategoryId()).map(Category::name).orElse(null)
                : null;

        return CourseDTOs.TeacherCourseResponse.builder()
                .id(course.getId())
                .code(course.getCode() != null ? course.getCode().getValue() : "")
                .slug(course.getCode() != null ? course.getCode().getValue() : "")
                .title(course.getTitle())
                .status(course.getStatus().name())
                .price(course.getPrice())
                .deliveryMode(course.getDeliveryMode() != null ? course.getDeliveryMode().name() : "SELF_PACED")
                .categoryName(categoryName)
                .description(course.getDescription())
                .thumbnail(course.getThumbnailUrl())
                // Stats populated by controller-level batch enrichment
                .sectionCount(0)
                .lessonCount(0)
                .enrolledCount(0)
                .studentsCount(0)
                .averageRating(0.0)
                .createdAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                .updatedAt(course.getUpdatedAt() != null ? course.getUpdatedAt().toString() : null)
                .build();
    }
}
