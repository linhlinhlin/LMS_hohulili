package com.example.lms.service;

import com.example.lms.entity.Assignment;
import com.example.lms.entity.Course;
import com.example.lms.entity.Lesson;
import com.example.lms.entity.LessonAssignment;
import com.example.lms.entity.Quiz;
import com.example.lms.entity.Section;
import com.example.lms.entity.User;
import com.example.lms.repository.AssignmentRepository;
import com.example.lms.repository.LessonAssignmentRepository;
import com.example.lms.repository.LessonRepository;
import com.example.lms.repository.SectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class LessonService {

    private final LessonRepository lessonRepository;
    private final SectionRepository sectionRepository;
    private final AssignmentRepository assignmentRepository;
    private final LessonAssignmentRepository lessonAssignmentRepository;
    private final QuizService quizService;

    public Lesson createLesson(UUID sectionId, User currentUser, com.example.lms.controller.LessonController.CreateLessonRequest request) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy section với ID: " + sectionId));
        
        // Check if user is the teacher of this course
        if (!section.getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền tạo bài học cho section này");
        }

        // Approval workflow removed: allow creating lessons regardless of course status

        // Set order index if not provided
        int orderIndex = request.getOrderIndex() != null ? request.getOrderIndex() : 
                        lessonRepository.findMaxOrderIndexBySection(section) + 1;

        // Determine lesson type - default to LECTURE if not specified
        Lesson.LessonType lessonType = request.getLessonType() != null ? 
                request.getLessonType() : Lesson.LessonType.LECTURE;

        Lesson lesson = Lesson.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .videoUrl(request.getVideoUrl())
                .durationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : 0)
                .orderIndex(orderIndex)
                .lessonType(lessonType)
                .section(section)
                .build();

        lesson = lessonRepository.save(lesson);

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
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài học với ID: " + lessonId));
        
        // Check if user is the teacher of this course
        if (!lesson.getSection().getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa bài học này");
        }

        // Approval workflow removed: allow editing lessons regardless of status

        if (request.getTitle() != null) {
            lesson.setTitle(request.getTitle());
        }

        if (request.getContent() != null) {
            lesson.setContent(request.getContent());
        }

        if (request.getVideoUrl() != null) {
            lesson.setVideoUrl(request.getVideoUrl());
        }

        if (request.getDurationMinutes() != null) {
            lesson.setDurationMinutes(request.getDurationMinutes());
        }

        if (request.getOrderIndex() != null) {
            lesson.setOrderIndex(request.getOrderIndex());
        }

        return lessonRepository.save(lesson);
    }

    public void deleteLesson(UUID lessonId, User currentUser) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài học với ID: " + lessonId));
        
        // Check if user is the teacher of this course
        if (!lesson.getSection().getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền xóa bài học này");
        }

        // Approval workflow removed: allow deleting lessons regardless of status

        lessonRepository.delete(lesson);
    }

    public Lesson getLessonById(UUID lessonId, User currentUser) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài học với ID: " + lessonId));
        
        // Check if user has access (is teacher or enrolled student)
        Course course = lesson.getSection().getCourse();
        boolean hasAccess = course.getTeacher().getId().equals(currentUser.getId()) ||
                          course.getEnrolledStudents().contains(currentUser);
        
        if (!hasAccess) {
            throw new RuntimeException("Bạn không có quyền truy cập bài học này");
        }

        return lesson;
    }

    public Lesson createAssignmentLesson(UUID sectionId, User currentUser,
            com.example.lms.controller.LessonController.CreateAssignmentLessonRequest request, Assignment assignment) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy section với ID: " + sectionId));

        // Check if user is the teacher of this course
        if (!section.getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền tạo bài học cho section này");
        }

        // Set order index if not provided
        int orderIndex = request.getOrderIndex() != null ? request.getOrderIndex() :
                        lessonRepository.findMaxOrderIndexBySection(section) + 1;

        // Save assignment first
        assignment.setCourse(section.getCourse());
        Assignment savedAssignment = assignmentRepository.save(assignment);

        // Create lesson with assignment type
        Lesson lesson = Lesson.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .videoUrl(request.getVideoUrl())
                .durationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : 0)
                .orderIndex(orderIndex)
                .section(section)
                .lessonType(Lesson.LessonType.ASSIGNMENT)
                .build();

        Lesson savedLesson = lessonRepository.save(lesson);

        // Create lesson-assignment relationship
        LessonAssignment lessonAssignment = LessonAssignment.builder()
                .lesson(savedLesson)
                .assignment(savedAssignment)
                .build();

        lessonAssignmentRepository.save(lessonAssignment);

        return savedLesson;
    }
}