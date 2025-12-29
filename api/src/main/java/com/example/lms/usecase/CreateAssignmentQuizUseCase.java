package com.example.lms.usecase;

import com.example.lms.dto.request.CreateAssignmentQuizRequest;
import com.example.lms.dto.response.QuizResponse;
import com.example.lms.entity.*;
import com.example.lms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import com.example.lms.learning_delivery.domain.model.LearningClass;

/**
 * Use Case: Create a standalone assignment quiz
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CreateAssignmentQuizUseCase {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CreateAssignmentQuizUseCase.class);

    private final QuizRepository quizRepository;
    private final CourseRepository courseRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;
    private final LearningClassRepository learningClassRepository;

    public QuizResponse execute(CreateAssignmentQuizRequest request, UUID teacherId) {
        log.info("Creating assignment quiz for course: {}, teacher: {}", request.getCourseId(), teacherId);

        // 1. Load and validate Course
        Course course = courseRepository.findById(request.getCourseId())
            .orElseThrow(() -> new IllegalArgumentException("Course not found: " + request.getCourseId()));

        // 2. Business rule: Teacher must own the course
        if (course.getTeacher() == null) {
             log.error("Course {} has no teacher assigned!", course.getId());
             throw new SecurityException("Course has no teacher assigned");
        }
        
        log.info("Checking course ownership. Course Teacher: {}, Current User: {}", course.getTeacher().getId(), teacherId);
        
        if (!course.getTeacher().getId().equals(teacherId)) {
            log.error("Ownership Check Failed! Course Teacher: {} != Current User: {}", course.getTeacher().getId(), teacherId);
            throw new SecurityException("You don't have permission to create quiz for this course (Owner Mismatch)");
        }

        // 3. Load and validate questions
        List<Question> questions = loadAndValidateQuestions(
            request.getQuestionIds(),
            course.getId()
        );

        // 4. Load teacher
        User teacher = userRepository.findById(teacherId)
            .orElseThrow(() -> new IllegalArgumentException("Teacher not found: " + teacherId));

        // 4b. Load Class if requested
        LearningClass learningClass = null;
        if (request.getClassId() != null) {
             learningClass = learningClassRepository.findById(request.getClassId())
                .orElseThrow(() -> new IllegalArgumentException("Class not found: " + request.getClassId()));
            
             if (!learningClass.getCourse().getId().equals(course.getId())) {
                 throw new IllegalArgumentException("Class does not belong to the specified course");
             }
        }

        // 5. Create Quiz Aggregate
        Quiz quiz = Quiz.builder()
            .type(Quiz.QuizType.ASSIGNMENT)
            .title(request.getTitle())
            .description(request.getDescription())
            .section(null) // ASSIGNMENT doesn't have section (was lesson)
            .course(course)
            .learningClass(learningClass)
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

        // 6. Add questions via domain method
        for (int i = 0; i < questions.size(); i++) {
            quiz.addQuestion(questions.get(i), i + 1);
        }

        // 7. Publish immediately if requested
        if (Boolean.TRUE.equals(request.getPublishImmediately())) {
            quiz.publish();
        }

        // 8. Save aggregate
        Quiz savedQuiz = quizRepository.save(quiz);

        log.info("Created assignment quiz: {} for course: {}", savedQuiz.getId(), request.getCourseId());

        // 9. Return DTO
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
        return QuizResponse.builder()
            .id(quiz.getId())
            .title(quiz.getTitle())
            .description(quiz.getDescription())
            .type(quiz.getType())
            .lessonId(null)
            .lessonTitle(null)
            .courseId(quiz.getCourse() != null ? quiz.getCourse().getId() : null)
            .courseTitle(quiz.getCourse() != null ? quiz.getCourse().getTitle() : null)
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
