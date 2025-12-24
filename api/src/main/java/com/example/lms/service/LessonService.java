package com.example.lms.service;

import com.example.lms.entity.Assignment;
import com.example.lms.entity.Course;
import com.example.lms.entity.Lesson;
import com.example.lms.entity.LessonAssignment;
import com.example.lms.entity.Quiz;
import com.example.lms.entity.Chapter;
import com.example.lms.entity.Section;
import com.example.lms.entity.User;
import com.example.lms.repository.AssignmentRepository;
import com.example.lms.repository.LessonAssignmentRepository;
import com.example.lms.repository.LessonRepository;
import com.example.lms.repository.ChapterRepository;
import com.example.lms.repository.SectionRepository;
import com.example.lms.util.AuthorizationHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class LessonService {

    private final LessonRepository lessonRepository;
    private final ChapterRepository chapterRepository; // Level 1
    private final SectionRepository sectionRepository; // Level 3
    private final AssignmentRepository assignmentRepository;
    private final LessonAssignmentRepository lessonAssignmentRepository;
    private final QuizService quizService;

    public Lesson createLesson(UUID chapterId, User currentUser, com.example.lms.controller.LessonController.CreateLessonRequest request) {
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chapter với ID: " + chapterId));
        
        // SOTA: Admin super access + Owner check
        if (!AuthorizationHelper.isOwnerOrAdmin(chapter.getCourse(), currentUser)) {
            throw new RuntimeException("Bạn không có quyền tạo bài học cho chapter này");
        }

        // Set order index if not provided
        int orderIndex = request.getOrderIndex() != null ? request.getOrderIndex() : 
                        lessonRepository.findMaxOrderIndexByChapter(chapter) + 1;

        // Determine lesson type - default to LECTURE if not specified
        Lesson.LessonType lessonType = request.getLessonType() != null ? 
                request.getLessonType() : Lesson.LessonType.LECTURE;

        Lesson lesson = Lesson.builder()
                .title(request.getTitle())
                .orderIndex(orderIndex)
                .lessonType(lessonType)
                .chapter(chapter)
                .build();

        lesson = lessonRepository.save(lesson);

        // Create Default Section (Content) if content provided
        if (request.getContent() != null || request.getVideoUrl() != null) {
            Section.SectionType type = Section.SectionType.TEXT;
            if (request.getVideoUrl() != null && !request.getVideoUrl().isEmpty()) {
                type = Section.SectionType.VIDEO;
            }

            Section section = Section.builder()
                    .title("Nội dung bài học")
                    .type(type)
                    .content(request.getContent())
                    .videoUrl(request.getVideoUrl())
                    .duration(request.getDurationMinutes() != null ? request.getDurationMinutes() : 0)
                    .lesson(lesson)
                    .orderIndex(0)
                    .build();
            sectionRepository.save(section);
        }

        // Create Quiz entity if lesson type is QUIZ
        if (lessonType == Lesson.LessonType.QUIZ) {
            Integer timeLimitMinutes = request.getQuizTimeLimit() != null ? request.getQuizTimeLimit() : 30;
            Integer maxAttempts = request.getQuizMaxAttempts() != null ? request.getQuizMaxAttempts() : 1;
            Integer passingScore = request.getQuizMaxScore() != null ? request.getQuizMaxScore() : 60;

            Quiz quiz = quizService.createQuiz(
                    lesson,
                    null, // questionIds will be set later when teacher selects questions
                    timeLimitMinutes,
                    maxAttempts,
                    passingScore,
                    false, // shuffleQuestions
                    false, // shuffleOptions
                    true,  // showResultsImmediately
                    false, // showCorrectAnswers
                    null,  // startDate
                    null   // endDate
            );
        }

        return lesson;
    }

    public Lesson updateLesson(UUID lessonId, User currentUser, com.example.lms.controller.LessonController.UpdateLessonRequest request) {
        // [FIX] Use JOIN FETCH to eagerly load sections
        Lesson lesson = lessonRepository.findByIdWithSections(lessonId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài học với ID: " + lessonId));
        
        // SOTA: Admin super access + Owner check
        if (!AuthorizationHelper.isOwnerOrAdmin(lesson.getChapter().getCourse(), currentUser)) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa bài học này");
        }

        if (request.getTitle() != null) {
            lesson.setTitle(request.getTitle());
        }
        
        if (request.getOrderIndex() != null) {
            lesson.setOrderIndex(request.getOrderIndex());
        }
        
        lessonRepository.save(lesson);

        // Update Content -> Propagate to first Section (Level 3)
        // Note: This maintains backward compatibility. New API users should use SectionController to manage sections directly.
        if (request.getContent() != null || request.getVideoUrl() != null || request.getDurationMinutes() != null) {
            List<Section> sections = sectionRepository.findByLessonIdOrderByOrderIndexAsc(lessonId);
            Section section;
            
            if (sections.isEmpty()) {
                // Create new default section
                Section.SectionType type = Section.SectionType.TEXT;
                if (request.getVideoUrl() != null && !request.getVideoUrl().isEmpty()) {
                    type = Section.SectionType.VIDEO;
                }
                
                section = Section.builder()
                        .title("Nội dung bài học")
                        .type(type)
                        .lesson(lesson)
                        .orderIndex(0)
                        .build();
            } else {
                section = sections.get(0);
            }

            if (request.getContent() != null) {
                section.setContent(request.getContent());
            }
            if (request.getVideoUrl() != null) {
                section.setVideoUrl(request.getVideoUrl());
                if (!request.getVideoUrl().isEmpty()) {
                    section.setType(Section.SectionType.VIDEO);
                }
            }
            if (request.getDurationMinutes() != null) {
                section.setDuration(request.getDurationMinutes());
            }
            
            sectionRepository.save(section);
        }

        return lesson;
    }

    public void deleteLesson(UUID lessonId, User currentUser) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài học với ID: " + lessonId));
        
        // SOTA: Admin super access + Owner check
        if (!AuthorizationHelper.isOwnerOrAdmin(lesson.getChapter().getCourse(), currentUser)) {
            throw new RuntimeException("Bạn không có quyền xóa bài học này");
        }

        lessonRepository.delete(lesson);
    }

    public Lesson getLessonById(UUID lessonId, User currentUser) {
        // [FIX] Use JOIN FETCH to eagerly load sections and avoid lazy loading exception
        Lesson lesson = lessonRepository.findByIdWithSections(lessonId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài học với ID: " + lessonId));
        
        // [FIX] Manually trigger lazy loading of attachments within transaction
        // This avoids MultipleBagFetchException from fetching multiple collections at once
        if (lesson.getAttachments() != null) {
            lesson.getAttachments().size(); // Force initialization
        }
        
        // SOTA: Admin super access + Owner + Enrolled check
        Course course = lesson.getChapter().getCourse();
        boolean isEnrolled = course.getEnrolledStudents().contains(currentUser);
        
        if (!AuthorizationHelper.canViewCourse(course, currentUser, isEnrolled)) {
            throw new RuntimeException("Bạn không có quyền truy cập bài học này");
        }

        return lesson;
    }

    public Lesson createAssignmentLesson(UUID chapterId, User currentUser,
            com.example.lms.controller.LessonController.CreateAssignmentLessonRequest request, Assignment assignment) {
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chapter với ID: " + chapterId));

        // SOTA: Admin super access + Owner check
        if (!AuthorizationHelper.isOwnerOrAdmin(chapter.getCourse(), currentUser)) {
            throw new RuntimeException("Bạn không có quyền tạo bài học cho chapter này");
        }

        // Set order index if not provided
        int orderIndex = request.getOrderIndex() != null ? request.getOrderIndex() :
                        lessonRepository.findMaxOrderIndexByChapter(chapter) + 1;

        // Save assignment first
        assignment.setCourse(chapter.getCourse());
        Assignment savedAssignment = assignmentRepository.save(assignment);

        // Create lesson with assignment type
        Lesson lesson = Lesson.builder()
                .title(request.getTitle())
                .orderIndex(orderIndex)
                .chapter(chapter)
                .lessonType(Lesson.LessonType.ASSIGNMENT)
                .build();

        Lesson savedLesson = lessonRepository.save(lesson);

        // Create Content Section for Description
        if (request.getContent() != null) {
             Section section = Section.builder()
                    .title("Hướng dẫn bài tập")
                    .type(Section.SectionType.TEXT)
                    .content(request.getContent())
                    .lesson(savedLesson)
                    .orderIndex(0)
                    .build();
            sectionRepository.save(section);
        }

        // Create lesson-assignment relationship
        LessonAssignment lessonAssignment = LessonAssignment.builder()
                .lesson(savedLesson)
                .assignment(savedAssignment)
                .build();

        lessonAssignmentRepository.save(lessonAssignment);

        return savedLesson;
    }
}
