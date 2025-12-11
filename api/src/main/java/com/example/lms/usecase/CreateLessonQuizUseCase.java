package com.example.lms.usecase;

import com.example.lms.dto.request.CreateLessonQuizRequest;
import com.example.lms.dto.response.QuizResponse;
import com.example.lms.entity.*;
import com.example.lms.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Use Case: Create a quiz attached to a lesson
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CreateLessonQuizUseCase {

    private static final Logger log = LoggerFactory.getLogger(CreateLessonQuizUseCase.class);

    private final QuizRepository quizRepository;
    private final LessonRepository lessonRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;

    public QuizResponse execute(UUID lessonId, CreateLessonQuizRequest request, UUID teacherId) {
        log.info("Creating lesson quiz for lesson: {}, teacher: {}", lessonId, teacherId);

        // 1. Load and validate Lesson
        Lesson lesson = lessonRepository.findById(lessonId)
            .orElseThrow(() -> new IllegalArgumentException("Lesson not found: " + lessonId));

        // 2. Business rule: Teacher must own the course
        UUID courseTeacherId = lesson.getChapter().getCourse().getTeacher().getId(); // Was getSection()
        if (!courseTeacherId.equals(teacherId)) {
            throw new SecurityException("You don't have permission to create quiz for this lesson");
        }

        // 3. Business rule: Lesson must be type QUIZ
        if (lesson.getLessonType() != Lesson.LessonType.QUIZ) {
            throw new IllegalArgumentException("Lesson type must be QUIZ");
        }

        // 4. Business rule: Lesson should not already have a quiz
        // Note: Repository method updated to join on section->lesson
        if (quizRepository.existsByLesson(lesson)) {
            throw new IllegalArgumentException("This lesson already has a quiz");
        }

        // 5. Load and validate questions
        List<Question> questions = loadAndValidateQuestions(
            request.getQuestionIds(),
            lesson.getChapter().getCourse().getId()
        );

        // 6. Load teacher
        User teacher = userRepository.findById(teacherId)
            .orElseThrow(() -> new IllegalArgumentException("Teacher not found: " + teacherId));

        // 6.5 Verify or Create Section (Level 3) for this Quiz
        // Since we are refactoring, we need to ensure the quiz attaches to a Section.
        // If the lesson is type QUIZ, it should have a corresponding Section.
        Section quizSection = lesson.getSections().stream()
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Lesson of type QUIZ has no content Section. Database migration might be incomplete."));

        // 7. Create Quiz Aggregate
        Quiz quiz = Quiz.builder()
            .type(Quiz.QuizType.LESSON_QUIZ)
            .title(request.getTitle())
            .description(request.getDescription())
            .section(quizSection) // Updated from lesson(lesson)
            .course(null)
            .createdBy(teacher)
            .timeLimitMinutes(request.getTimeLimitMinutes())
            .maxAttempts(request.getMaxAttempts())
            .passingScore(request.getPassingScore())
            .shuffleQuestions(request.getShuffleQuestions())
            .shuffleOptions(request.getShuffleOptions())
            .showResultsImmediately(request.getShowResultsImmediately())
            .showCorrectAnswers(request.getShowCorrectAnswers())
            .startDate(request.getStartDate())
            .endDate(request.getEndDate())
            .build();

        // 8. Add questions via domain method (encapsulated validation)
        for (int i = 0; i < questions.size(); i++) {
            quiz.addQuestion(questions.get(i), i + 1);
        }

        // 9. Publish immediately if requested
        if (Boolean.TRUE.equals(request.getPublishImmediately())) {
            quiz.publish();
        }

        // 10. Save aggregate
        Quiz savedQuiz = quizRepository.save(quiz);

        log.info("Created lesson quiz: {} for lesson: {}", savedQuiz.getId(), lessonId);

        // 11. Return DTO
        return mapToResponse(savedQuiz);
    }

    private List<Question> loadAndValidateQuestions(List<UUID> questionIds, UUID courseId) {
        List<Question> questions = questionRepository.findAllById(questionIds);

        if (questions.size() != questionIds.size()) {
            throw new IllegalArgumentException("Some questions not found");
        }

        // Validate all questions belong to the course
        boolean allBelongToCourse = questions.stream()
            .allMatch(q -> q.belongsToCourse(courseId));

        if (!allBelongToCourse) {
            throw new IllegalArgumentException(
                "All questions must belong to the course: " + courseId
            );
        }

        return questions;
    }

    private QuizResponse mapToResponse(Quiz quiz) {
        // Safely access nested properties to avoid lazy loading issues
        UUID lessonId = null;
        String lessonTitle = null;
        UUID courseId = null;
        String courseTitle = null;
        
        if (quiz.getSection() != null && quiz.getSection().getLesson() != null) {
            lessonId = quiz.getSection().getLesson().getId();
            lessonTitle = quiz.getSection().getLesson().getTitle();
            
            if (quiz.getSection().getLesson().getChapter() != null && 
                quiz.getSection().getLesson().getChapter().getCourse() != null) {
                courseId = quiz.getSection().getLesson().getChapter().getCourse().getId();
                courseTitle = quiz.getSection().getLesson().getChapter().getCourse().getTitle();
            }
        }
        
        return QuizResponse.builder()
            .id(quiz.getId())
            .title(quiz.getTitle())
            .description(quiz.getDescription())
            .type(quiz.getType())
            .lessonId(lessonId)
            .lessonTitle(lessonTitle)
            .courseId(courseId)
            .courseTitle(courseTitle)
            .timeLimitMinutes(quiz.getTimeLimitMinutes())
            .maxAttempts(quiz.getMaxAttempts())
            .passingScore(quiz.getPassingScore())
            .shuffleQuestions(quiz.getShuffleQuestions())
            .shuffleOptions(quiz.getShuffleOptions())
            .showResultsImmediately(quiz.getShowResultsImmediately())
            .showCorrectAnswers(quiz.getShowCorrectAnswers())
            .startDate(quiz.getStartDate())
            .endDate(quiz.getEndDate())
            .questionCount(quiz.getQuizQuestions() != null ? quiz.getQuizQuestions().size() : 0)
            .createdBy(quiz.getCreatedBy() != null ? quiz.getCreatedBy().getId() : null)
            .createdByName(quiz.getCreatedBy() != null ? quiz.getCreatedBy().getFullName() : null)
            .publishedAt(quiz.getPublishedAt())
            .createdAt(quiz.getCreatedAt())
            .updatedAt(quiz.getUpdatedAt())
            .build();
    }
}
