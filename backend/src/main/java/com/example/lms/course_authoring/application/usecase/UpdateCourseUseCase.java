package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.UpdateCourseCommand;
import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
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

        // Update pricing
        Course.PriceType priceType = parsePriceType(command.priceType());
        if (priceType != null || command.price() != null) {
            course.updatePricing(priceType, command.price(), command.salePrice());
        }

        // Update visibility
        Course.Visibility visibility = parseVisibility(command.visibility());
        if (visibility != null) {
            course.updateVisibility(visibility);
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
}
