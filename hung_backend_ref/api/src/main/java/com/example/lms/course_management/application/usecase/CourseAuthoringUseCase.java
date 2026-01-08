package com.example.lms.course_management.application.usecase;

import com.example.lms.course_management.application.dto.AuthoringDTOs;
import com.example.lms.course_management.application.dto.CourseDTOs;
import com.example.lms.course_authoring.domain.model.Chapter;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.model.Lesson;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.domain.valueobject.TeacherId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseAuthoringUseCase {

    private final JpaCourseRepository courseRepository;

    @Transactional(readOnly = true)
    public AuthoringDTOs.CourseDraftDTO getCourseDraft(UUID courseId) {
        Course course = courseRepository.findByIdWithContent(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found: " + courseId));

        return mapToDraftDTO(course);
    }

    @Transactional
    public void reorderChapters(UUID courseId, List<UUID> orderedChapterIds) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found"));
        
        course.reorderChapters(orderedChapterIds);
        courseRepository.save(course);
    }

    @Transactional
    public void reorderLessons(UUID chapterId, List<UUID> orderedLessonIds) {
        Course course = courseRepository.findByChapterId(chapterId)
                .orElseThrow(() -> new RuntimeException("Course not found for chapter: " + chapterId));
        
        // Manual reorder loop as Domain might not expose direct lesson reorder on AR via ChapterId
        course.getChapters().stream()
             .filter(c -> c.getId().equals(chapterId))
             .findFirst()
             .ifPresent(chapter -> {
                 chapter.reorderLessons(orderedLessonIds);
             });
             
        courseRepository.save(course);
    }

    @Transactional
    public void updateLesson(UUID lessonId, AuthoringDTOs.UpdateLessonRequest request) {
        Course course = courseRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new RuntimeException("Course not found for lesson: " + lessonId));
        
         course.getChapters().stream()
             .flatMap(c -> c.getLessons().stream())
             .filter(l -> l.getId().equals(lessonId))
             .findFirst()
             .ifPresent(l -> {
                 if (request.getTitle() != null) l.updateInfo(request.getTitle(), l.getDescription(), l.getLessonType());
                 if (request.getContentUrl() != null) l.updateVideoUrl(request.getContentUrl());
                 if (request.getContentHtml() != null) l.updateContent(request.getContentHtml());
                 
                 Integer duration = request.getDurationSeconds() != null ? request.getDurationSeconds() : l.getDurationMinutes(); // Note: Entity uses Minutes? DTO Seconds?
                 // Entity line 35: durationMinutes. DTO: durationSeconds.
                 // Need conversion? 
                 // Assuming DTO is seconds, Entity Minutes.
                 // If DTO is seconds, /60? 
                 // Frontend `LessonDraftDTO` has durationSeconds.
                 // Let's assume request sends Seconds.
                 Integer durationMinutes = request.getDurationSeconds() != null ? request.getDurationSeconds() / 60 : l.getDurationMinutes();
                 
                 Boolean req = request.getIsRequired() != null ? request.getIsRequired() : l.getIsRequired();
                 Boolean prev = l.getIsPreview(); // No isPreview in request? 
                 
                 l.updateSettings(durationMinutes, req, prev);
             });
        
        courseRepository.save(course);
    }

    // --- Lifecycle Methods ---

    @Transactional
    public AuthoringDTOs.CourseDraftDTO createCourse(CourseDTOs.CreateCourseRequest request, UUID teacherId) {
        if (courseRepository.existsByCodeValue(request.getCode())) {
           throw new RuntimeException("Course code already exists: " + request.getCode());
        }

        Course course = Course.create(
            CourseCode.of(request.getCode()),
            request.getTitle(),
            request.getDescription(),
            teacherId
        );
        
        courseRepository.save(course);
        return mapToDraftDTO(course);
    }

    @Transactional
    public void updateCourse(UUID courseId, CourseDTOs.UpdateCourseRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found"));
        
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
                .orElseThrow(() -> new RuntimeException("Course not found"));
        course.submitForApproval();
        courseRepository.save(course);
    }

    @Transactional
    public void cancelApproval(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found"));
        course.cancelApprovalRequest(); 
        courseRepository.save(course);
    }

    @Transactional(readOnly = true)
    public CourseDTOs.CourseReviewStatusDTO getReviewStatus(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found"));
        
        return CourseDTOs.CourseReviewStatusDTO.builder()
                .courseId(course.getId().toString())
                .status(course.getStatus().name())
                .reviewComment(course.getReviewComment())
                .reviewedAt(course.getReviewedAt() != null ? course.getReviewedAt().toString() : null)
                .build();
    }
    
    // Mappers
    private AuthoringDTOs.CourseDraftDTO mapToDraftDTO(Course course) {
        List<AuthoringDTOs.ChapterDraftDTO> chapters = course.getChapters().stream()
                .sorted(Comparator.comparingInt(c -> c.getOrderIndex() != null ? c.getOrderIndex() : 999))
                .map(this::mapChapter)
                .collect(Collectors.toList());

        return AuthoringDTOs.CourseDraftDTO.builder()
                .id(course.getId())
                .code(course.getCode().getValue())
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnailUrl(course.getThumbnailUrl())
                .price(course.getPrice())
                .priceType(course.getPriceType().name())
                .chapters(chapters)
                .build();
    }
    
    private AuthoringDTOs.ChapterDraftDTO mapChapter(Chapter chapter) {
         List<AuthoringDTOs.LessonDraftDTO> lessons = chapter.getLessons().stream()
                .sorted(Comparator.comparingInt(l -> l.getOrderIndex() != null ? l.getOrderIndex() : 999))
                .map(this::mapLesson)
                .collect(Collectors.toList());

        return AuthoringDTOs.ChapterDraftDTO.builder()
                .id(chapter.getId())
                .title(chapter.getTitle())
                .orderIndex(chapter.getOrderIndex())
                .lessons(lessons)
                .build();
    }

    private AuthoringDTOs.LessonDraftDTO mapLesson(Lesson lesson) {
        return AuthoringDTOs.LessonDraftDTO.builder()
                .id(lesson.getId())
                .title(lesson.getTitle())
                .type(lesson.getLessonType().name())
                .contentUrl(lesson.getVideoUrl()) // Use getVideoUrl for contentUrl if video
                .contentHtml(lesson.getContent()) // Use getContent for contentHtml
                .durationSeconds(lesson.getDurationMinutes() != null ? lesson.getDurationMinutes() * 60 : 0)
                .isRequired(lesson.getIsRequired())
                .orderIndex(lesson.getOrderIndex())
                .build();
    }

    // --- Query Methods ---
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<CourseDTOs.TeacherCourseResponse> getMyCourses(UUID teacherId, org.springframework.data.domain.Pageable pageable) {
         return courseRepository.findByTeacherId(teacherId, pageable)
                 .map(this::mapToTeacherCourseResponse);
    }
    
    private CourseDTOs.TeacherCourseResponse mapToTeacherCourseResponse(Course course) {
        // Note: sectionCount and lessonCount are 0 to avoid LazyInitializationException
        // For accurate counts, use separate count queries or @EntityGraph
        return CourseDTOs.TeacherCourseResponse.builder()
                .id(course.getId())
                .slug(course.getCode() != null ? course.getCode().getValue() : "")
                .title(course.getTitle())
                .status(course.getStatus().name())
                .price(course.getPrice())
                .sectionCount(0) // TODO: Use count query if needed
                .lessonCount(0)  // TODO: Use count query if needed
                .description(course.getDescription())
                .thumbnail(course.getThumbnailUrl())
                .studentsCount(0) 
                .averageRating(0.0)
                .createdAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                .updatedAt(course.getUpdatedAt() != null ? course.getUpdatedAt().toString() : null)
                .build();
    }
}
