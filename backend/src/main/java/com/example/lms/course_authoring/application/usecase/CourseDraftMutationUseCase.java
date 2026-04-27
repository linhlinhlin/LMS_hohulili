package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CourseDraftMutationUseCase {

    private final CourseRepository courseRepository;

    @Transactional(readOnly = true)
    public Course requireEditableCourse(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        if (!course.isEditable()) {
            throw com.example.lms.shared.exception.BusinessRuleException.courseNotEditable();
        }

        return course;
    }

    @Transactional(readOnly = true)
    public Course requireEditableCourseByChapter(UUID chapterId) {
        Course course = courseRepository.findByChapterId(chapterId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", chapterId));

        if (!course.isEditable()) {
            throw com.example.lms.shared.exception.BusinessRuleException.courseNotEditable();
        }

        return course;
    }

    @Transactional(readOnly = true)
    public Course requireEditableCourseByLesson(UUID lessonId) {
        Course course = courseRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", lessonId));

        if (!course.isEditable()) {
            throw com.example.lms.shared.exception.BusinessRuleException.courseNotEditable();
        }

        return course;
    }

    @Transactional
    public Course markCourseChanged(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));
        course.markDraftChanged();
        course.incrementContentVersion();
        return courseRepository.save(course);
    }

    @Transactional
    public Course markCourseChangedByChapter(UUID chapterId) {
        Course course = courseRepository.findByChapterId(chapterId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", chapterId));
        course.markDraftChanged();
        course.incrementContentVersion();
        return courseRepository.save(course);
    }

    @Transactional
    public Course markCourseChangedByLesson(UUID lessonId) {
        Course course = courseRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", lessonId));
        course.markDraftChanged();
        course.incrementContentVersion();
        return courseRepository.save(course);
    }
}
