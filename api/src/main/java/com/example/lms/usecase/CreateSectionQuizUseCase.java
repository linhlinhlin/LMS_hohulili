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
 * Use Case: Create a quiz attached to a SECTION (Level 3)
 * Replaces CreateLessonQuizUseCase for the new Lecture-Section model.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CreateSectionQuizUseCase {

    private static final Logger log = LoggerFactory.getLogger(CreateSectionQuizUseCase.class);

    private final QuizRepository quizRepository;
    private final SectionRepository sectionRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;

    public QuizResponse execute(UUID sectionId, CreateLessonQuizRequest request, UUID teacherId) {
        log.info("Creating section quiz for section: {}, teacher: {}", sectionId, teacherId);

        // 1. Load and validate Section
        Section section = sectionRepository.findById(sectionId)
            .orElseThrow(() -> new IllegalArgumentException("Section not found: " + sectionId));

        // 2. Business rule: Teacher must own the course
        UUID courseTeacherId = section.getLesson().getChapter().getCourse().getTeacher().getId();
        if (!courseTeacherId.equals(teacherId)) {
            throw new SecurityException(String.format("You don't have permission to create quiz for this section. Course Owner: %s, Current User: %s", courseTeacherId, teacherId));
        }

        // 3. Business rule: Section must be type QUIZ
        if (section.getType() != Section.SectionType.QUIZ) {
            throw new IllegalArgumentException("Section type must be QUIZ");
        }

        // 4. Business rule: Section should not already have a quiz
        // Check if any quiz is linked to this section
        if (quizRepository.findBySectionId(section.getId()).isPresent()) {
             // Optional: Allow update if exists? For now, let's throw error or maybe we should just return the existing one?
             // Standard POST Create usually fails if exists.
             // But for idempotency, maybe we can delete old one?
             // Let's stick to strict validation for now.
             throw new IllegalArgumentException("This section already has a quiz");
        }

        // 5. Load and validate questions
        List<Question> questions = loadAndValidateQuestions(
            request.getQuestionIds(),
            section.getLesson().getChapter().getCourse().getId()
        );

        // 6. Load teacher
        User teacher = userRepository.findById(teacherId)
            .orElseThrow(() -> new IllegalArgumentException("Teacher not found: " + teacherId));

        // 7. Create Quiz Aggregate
        Quiz quiz = Quiz.builder()
            .type(Quiz.QuizType.LESSON_QUIZ)
            .title(request.getTitle())
            .description(request.getDescription())
            .section(section)
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

        // 8. Add questions
        for (int i = 0; i < questions.size(); i++) {
            quiz.addQuestion(questions.get(i), i + 1);
        }

        // 9. Publish
        if (Boolean.TRUE.equals(request.getPublishImmediately())) {
            quiz.publish();
        }

        // 10. Save
        Quiz savedQuiz = quizRepository.save(quiz);

        log.info("Created section quiz: {} for section: {}", savedQuiz.getId(), sectionId);

        return mapToResponse(savedQuiz);
    }

    private List<Question> loadAndValidateQuestions(List<UUID> questionIds, UUID courseId) {
        List<Question> questions = questionRepository.findAllById(questionIds);

        if (questions.size() != questionIds.size()) {
            throw new IllegalArgumentException("Some questions not found");
        }

        boolean allBelongToCourse = questions.stream()
            .allMatch(q -> q.belongsToCourse(courseId));

        if (!allBelongToCourse) {
            throw new IllegalArgumentException("All questions must belong to the course: " + courseId);
        }

        return questions;
    }

    private QuizResponse mapToResponse(Quiz quiz) {
        // Mapping logic similar to CreateLessonQuizUseCase
        UUID lessonId = quiz.getSection().getLesson().getId();
        String lessonTitle = quiz.getSection().getLesson().getTitle();
        UUID courseId = quiz.getSection().getLesson().getChapter().getCourse().getId();
        String courseTitle = quiz.getSection().getLesson().getChapter().getCourse().getTitle();
        
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
