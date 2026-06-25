package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.AuthoringDTOs;
import com.example.lms.course_authoring.application.dto.CourseDTOs;
import com.example.lms.course_authoring.application.service.CourseDeletionCleanupService;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.model.CourseCategory;
import com.example.lms.course_authoring.domain.repository.ChapterRepositoryPort;
import com.example.lms.course_authoring.domain.repository.CourseCategoryRepository;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseReviewEventJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseReviewEventJpaRepository;
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
    private final CourseCategoryRepository courseCategoryRepository;
    private final ChapterRepositoryPort chapterRepository;
    private final GetCourseDraftUseCase getCourseDraftUseCase;
    private final CourseReviewEventJpaRepository reviewEventRepository;
    private final CourseDeletionCleanupService courseDeletionCleanupService;

    private static final int MAX_CODE_RETRY = 3;

    // --- Lifecycle Methods ---

    @Transactional
    public AuthoringDTOs.CourseDraftDTO createCourse(CourseDTOs.CreateCourseRequest request, UUID teacherId) {
        return createCourse(request, teacherId, null);
    }

    @Transactional
    public AuthoringDTOs.CourseDraftDTO createCourse(CourseDTOs.CreateCourseRequest request, UUID teacherId, UUID organizationId) {
        CourseCategory selectedCategory = courseCategoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new EntityNotFoundException("Danh mục", request.getCategoryId()));

        // Resolve prefix: subcategory → use parent's prefix; root → use own prefix
        String prefix;
        if (selectedCategory.isSubcategory()) {
            CourseCategory parent = courseCategoryRepository.findById(selectedCategory.getParentId())
                    .orElseThrow(() -> new EntityNotFoundException("Danh mục cha", selectedCategory.getParentId()));
            prefix = parent.getPrefix();
        } else {
            prefix = selectedCategory.getPrefix();
        }
        if (prefix == null || prefix.isBlank()) {
            throw new BusinessRuleException("NO_PREFIX", "Danh mục không có prefix để tạo mã khóa học");
        }

        for (int attempt = 0; attempt < MAX_CODE_RETRY; attempt++) {
            int maxSeq = courseRepository.findMaxSequenceNumberByPrefix(prefix);
            String code = String.format("%s-%03d", prefix, maxSeq + 1);

            Course course = Course.create(
                CourseCode.of(code),
                request.getTitle(),
                request.getDescription(),
                teacherId
            );
            course.assignOrganization(organizationId);
            course.updateCategory(request.getCategoryId());

            // Set delivery mode if specified
            if (request.getDeliveryMode() != null && !request.getDeliveryMode().isBlank()) {
                try {
                    Course.DeliveryMode mode = Course.DeliveryMode.valueOf(request.getDeliveryMode().toUpperCase());
                    course.updateDeliveryMode(mode);
                    // INSTRUCTOR_LED courses default to no offline download
                    if (mode == Course.DeliveryMode.INSTRUCTOR_LED) {
                        course.updateAllowOfflineDownload(false);
                    }
                } catch (IllegalArgumentException ignored) {
                    // Default SELF_PACED is already set
                }
            }

            applyInitialPricing(course, request);

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

    private void applyInitialPricing(Course course, CourseDTOs.CreateCourseRequest request) {
        Course.PriceType requestedPriceType = parsePriceType(request.getPriceType());
        boolean hasPricingInput = requestedPriceType != null
                || request.getPrice() != null
                || request.getSalePrice() != null;

        if (!hasPricingInput) {
            return;
        }

        Course.PriceType effectivePriceType = requestedPriceType != null
                ? requestedPriceType
                : Course.PriceType.PAID;

        if (effectivePriceType == Course.PriceType.PAID) {
            java.math.BigDecimal price = request.getPrice();
            java.math.BigDecimal salePrice = request.getSalePrice();

            if (price == null || price.compareTo(java.math.BigDecimal.ZERO) <= 0) {
                throw new BusinessRuleException("INVALID_PRICE", "Khóa học trả phí phải có giá lớn hơn 0.");
            }

            if (salePrice != null
                    && salePrice.compareTo(java.math.BigDecimal.ZERO) > 0
                    && salePrice.compareTo(price) >= 0) {
                throw new BusinessRuleException("INVALID_SALE_PRICE", "Giá khuyến mãi phải nhỏ hơn giá gốc.");
            }
        }

        course.updatePricing(effectivePriceType, request.getPrice(), request.getSalePrice());
    }

    private Course.PriceType parsePriceType(String priceType) {
        if (priceType == null || priceType.isBlank()) {
            return null;
        }
        try {
            return Course.PriceType.valueOf(priceType.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
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
             // Validate salePrice < price (Udemy/Coursera pattern)
             if (type == Course.PriceType.PAID) {
                 java.math.BigDecimal effectivePrice = request.getPrice() != null ? request.getPrice() : course.getPrice();
                 java.math.BigDecimal effectiveSalePrice = request.getSalePrice() != null ? request.getSalePrice() : course.getSalePrice();
                 if (effectiveSalePrice != null && effectivePrice != null
                         && effectiveSalePrice.compareTo(java.math.BigDecimal.ZERO) > 0
                         && effectiveSalePrice.compareTo(effectivePrice) >= 0) {
                     throw new BusinessRuleException("Giá khuyến mãi phải nhỏ hơn giá gốc.");
                 }
             }
             course.updatePricing(type, request.getPrice(), request.getSalePrice());
        }

        if (request.getThumbnailUrl() != null) {
            course.updateThumbnail(request.getThumbnailUrl());
        }

        courseRepository.save(course);
    }

    @Transactional
    public void deleteCourse(UUID courseId) {
        if (!courseRepository.existsById(courseId)) {
            throw new EntityNotFoundException("Khóa học", courseId);
        }
        courseDeletionCleanupService.cleanupBeforeDelete(courseId);
        courseRepository.deleteById(courseId);
    }

    @Transactional
    public void submitForApproval(UUID courseId) {
        submitForApproval(courseId, null, null);
    }

    @Transactional
    public void submitForApproval(UUID courseId, UUID teacherId, String releaseNotes) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        // Cross-aggregate validation: chapters exist in separate aggregate
        long chapterCount = chapterRepository.countByCourseId(courseId);
        if (chapterCount == 0) {
            throw new BusinessRuleException("NO_CHAPTERS",
                "Khóa học phải có ít nhất 1 chương trước khi gửi duyệt");
        }

        // Store release notes for admin review
        if (releaseNotes != null && !releaseNotes.isBlank()) {
            course.setPendingReleaseNotes(releaseNotes.trim());
        }

        course.submitForApproval();
        courseRepository.save(course);

        // Record audit event
        reviewEventRepository.save(CourseReviewEventJpaEntity.builder()
                .courseId(courseId)
                .reviewerId(teacherId != null ? teacherId : course.getTeacherId())
                .action("SUBMITTED")
                .comment(releaseNotes)
                .build());
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

        // Pull latest rejection category from the audit trail (most-recent REJECTED or CHANGES_REQUESTED event)
        String rejectionCategory = reviewEventRepository.findByCourseIdOrderByCreatedAtDesc(courseId)
                .stream()
                .filter(ev -> "REJECTED".equals(ev.getAction()) || "CHANGES_REQUESTED".equals(ev.getAction()))
                .map(CourseReviewEventJpaEntity::getRejectionCategory)
                .filter(s -> s != null && !s.isBlank())
                .findFirst()
                .orElse(null);

        // Surface draft change-set state (NONE → null for FE clarity) so FE can tell
        // "APPROVED + CHANGES_REQUESTED draft" apart from "APPROVED, nothing pending".
        String draftChangeStatus = course.getDraftChangeStatus() != null
                && course.getDraftChangeStatus() != Course.DraftChangeStatus.NONE
                ? course.getDraftChangeStatus().name()
                : null;

        return CourseDTOs.CourseReviewStatusDTO.builder()
                .courseId(course.getId().toString())
                .status(course.getStatus().name())
                .draftChangeStatus(draftChangeStatus)
                .reviewComment(course.getReviewComment())
                .reviewedAt(course.getReviewedAt() != null ? course.getReviewedAt().toString() : null)
                .rejectionCategory(rejectionCategory)
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
                ? courseCategoryRepository.findById(course.getCategoryId()).map(CourseCategory::getName).orElse(null)
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
