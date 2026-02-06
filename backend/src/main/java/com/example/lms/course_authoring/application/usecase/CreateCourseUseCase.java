package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CreateCourseCommand;
import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.ValidationException;
import com.example.lms.shared.domain.event.DomainEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Use case for creating a new course.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CreateCourseUseCase {

    private final CourseRepository courseRepository;
    private final DomainEventPublisher eventPublisher;

    @Transactional
    public CourseResponse execute(CreateCourseCommand command) {
        // Validate and create course code
        CourseCode code = CourseCode.of(command.code());

        // Check for duplicate code
        if (courseRepository.existsByCode(code)) {
            throw new ValidationException("code", "Mã khóa học đã tồn tại: " + command.code());
        }

        // Create course
        Course course = Course.create(
            code,
            command.title(),
            command.description(),
            command.teacherId()
        );

        // Set optional fields
        if (command.categoryId() != null) {
            course.updateCategory(command.categoryId());
        }

        if (command.tags() != null && !command.tags().isEmpty()) {
            course.updateTags(command.tags());
        }

        course.updateExtendedInfo(
            command.welcomeMessage(),
            command.courseInformation(),
            command.benefits(),
            command.introVideoUrl(),
            command.credits()
        );

        // Set pricing
        Course.PriceType priceType = parsePriceType(command.priceType());
        course.updatePricing(priceType, command.price(), command.salePrice());

        // Set visibility
        Course.Visibility visibility = parseVisibility(command.visibility());
        course.updateVisibility(visibility);

        // Save course
        course = courseRepository.save(course);

        // Publish domain events
        course.getDomainEvents().forEach(eventPublisher::publish);
        course.clearDomainEvents();

        log.info("Course created: {} - {}", course.getCode().getValue(), course.getTitle());

        return CourseResponse.from(course);
    }

    private Course.PriceType parsePriceType(String priceType) {
        if (priceType == null || priceType.isBlank()) {
            return Course.PriceType.FREE;
        }
        try {
            return Course.PriceType.valueOf(priceType.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Course.PriceType.FREE;
        }
    }

    private Course.Visibility parseVisibility(String visibility) {
        if (visibility == null || visibility.isBlank()) {
            return Course.Visibility.PUBLIC;
        }
        try {
            return Course.Visibility.valueOf(visibility.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Course.Visibility.PUBLIC;
        }
    }
}
