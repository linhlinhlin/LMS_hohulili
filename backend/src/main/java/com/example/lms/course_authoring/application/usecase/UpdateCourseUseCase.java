package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.UpdateCourseCommand;
import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Use case for updating an existing course.
 */
@Service
@RequiredArgsConstructor
public class UpdateCourseUseCase {

    private final CourseRepository courseRepository;
    private final EnrollmentRepositoryPort enrollmentRepository;

    @Transactional
    public CourseResponse execute(UpdateCourseCommand command) {
        // Find course
        Course course = courseRepository.findById(command.courseId())
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", command.courseId()));

        // Check ownership
        // Check ownership
        if (!course.isOwnedBy(command.userId()) && !command.isAdmin()) {
            throw new UnauthorizedException("chỉnh sửa", "khóa học này");
        }

        // Update basic info
        course.updateInfo(command.title(), command.description());

        // Update thumbnail
        if (command.thumbnailUrl() != null) {
            course.updateThumbnail(command.thumbnailUrl());
        }

        // Update category
        if (command.categoryId() != null) {
            course.updateCategory(command.categoryId());
        }

        // Update tags
        if (command.tags() != null) {
            course.updateTags(command.tags());
        }

        // Update extended info
        course.updateExtendedInfo(
            command.welcomeMessage(),
            command.courseInformation(),
            command.benefits(),
            command.introVideoUrl(),
            command.credits()
        );

        // Update pricing (with validation — Udemy/Coursera pattern)
        Course.PriceType priceType = parsePriceType(command.priceType());
        if (priceType != null || command.price() != null) {
            // Validate: PAID requires price > 0 (Udemy/Coursera pattern)
            Course.PriceType effectiveType = priceType != null ? priceType : course.getPriceType();
            if (effectiveType == Course.PriceType.PAID) {
                java.math.BigDecimal effectivePrice = command.price() != null ? command.price() : course.getPrice();
                if (effectivePrice == null || effectivePrice.compareTo(java.math.BigDecimal.ZERO) <= 0) {
                    throw new BusinessRuleException("Khóa học trả phí phải có giá lớn hơn 0.");
                }
                // Validate: salePrice < price when both set
                java.math.BigDecimal effectiveSalePrice = command.salePrice() != null ? command.salePrice() : course.getSalePrice();
                if (effectiveSalePrice != null && effectiveSalePrice.compareTo(java.math.BigDecimal.ZERO) > 0
                        && effectivePrice != null && effectiveSalePrice.compareTo(effectivePrice) >= 0) {
                    throw new BusinessRuleException("Giá khuyến mãi phải nhỏ hơn giá gốc.");
                }
            }
            course.updatePricing(priceType, command.price(), command.salePrice());
        }

        // Update visibility
        Course.Visibility visibility = parseVisibility(command.visibility());
        if (visibility != null) {
            course.updateVisibility(visibility);
        }

        // Update allowOfflineDownload
        if (command.allowOfflineDownload() != null) {
            course.updateAllowOfflineDownload(command.allowOfflineDownload());
        }

        // Update delivery mode (locked after first enrollment — Open edX immutable pattern)
        Course.DeliveryMode newDeliveryMode = parseDeliveryMode(command.deliveryMode());
        if (newDeliveryMode != null && newDeliveryMode != course.getDeliveryMode()) {
            if (enrollmentRepository.existsByCourseId(course.getId())) {
                throw new BusinessRuleException(
                    "Không thể thay đổi hình thức giảng dạy khi đã có học viên đăng ký. " +
                    "Vui lòng tạo khóa học mới với hình thức khác."
                );
            }
            course.updateDeliveryMode(newDeliveryMode);
        }

        // Save course
        course = courseRepository.save(course);

        return CourseResponse.from(course);
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

    private Course.Visibility parseVisibility(String visibility) {
        if (visibility == null || visibility.isBlank()) {
            return null;
        }
        try {
            return Course.Visibility.valueOf(visibility.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private Course.DeliveryMode parseDeliveryMode(String deliveryMode) {
        if (deliveryMode == null || deliveryMode.isBlank()) {
            return null;
        }
        try {
            return Course.DeliveryMode.valueOf(deliveryMode.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
