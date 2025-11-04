package com.example.lms.service;

import com.example.lms.entity.*;
import com.example.lms.repository.QuizAttemptRepository;
import com.example.lms.repository.QuizRepository;
import com.example.lms.repository.QuestionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizService {

    private final QuizRepository quizRepository;
    private final QuizAttemptRepository attemptRepository;
    private final QuestionRepository questionRepository;
    private final QuestionService questionService;
    private final ObjectMapper objectMapper;

    @Transactional
    public Quiz createQuiz(Lesson lesson, List<UUID> questionIds, Integer timeLimitMinutes,
                          Integer maxAttempts, Integer passingScore, Boolean shuffleQuestions,
                          Boolean shuffleOptions, Boolean showResultsImmediately,
                          Boolean showCorrectAnswers, Instant startDate, Instant endDate) {
        try {
            String questionIdsJson = questionIds != null && !questionIds.isEmpty() 
                    ? objectMapper.writeValueAsString(questionIds) 
                    : null;
            
            Quiz quiz = Quiz.builder()
                    .lesson(lesson)
                    .questionIds(questionIdsJson)
                    .timeLimitMinutes(timeLimitMinutes)
                    .maxAttempts(maxAttempts != null ? maxAttempts : 1)
                    .passingScore(passingScore != null ? passingScore : 60)
                    .shuffleQuestions(shuffleQuestions != null ? shuffleQuestions : false)
                    .shuffleOptions(shuffleOptions != null ? shuffleOptions : false)
                    .showResultsImmediately(showResultsImmediately != null ? showResultsImmediately : true)
                    .showCorrectAnswers(showCorrectAnswers != null ? showCorrectAnswers : false)
                    .startDate(startDate)
                    .endDate(endDate)
                    .build();

            return quizRepository.save(quiz);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create quiz", e);
        }
    }

    public Quiz getQuizByLessonId(UUID lessonId) {
        return quizRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new RuntimeException("Quiz not found for lesson"));
    }

    public List<Question> getQuizQuestions(UUID lessonId) {
        Quiz quiz = getQuizByLessonId(lessonId);
        return getQuizQuestions(quiz);
    }

    @Transactional
    public Quiz updateQuizQuestions(UUID lessonId, List<UUID> questionIds) {
        Quiz quiz = getQuizByLessonId(lessonId);
        
        try {
            // Serialize questionIds list to JSON array string
            String questionIdsJson = questionIds != null && !questionIds.isEmpty() 
                    ? objectMapper.writeValueAsString(questionIds) 
                    : null;
            quiz.setQuestionIds(questionIdsJson);
            
            Quiz savedQuiz = quizRepository.save(quiz);
            System.out.println("✅ Updated quiz " + lessonId + " with " + 
                             (questionIds != null ? questionIds.size() : 0) + " questions");
            System.out.println("   JSON: " + questionIdsJson);
            return savedQuiz;
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize question IDs", e);
        }
    }

    @Transactional
    public QuizAttempt startAttempt(User student, UUID lessonId) {
        Quiz quiz = getQuizByLessonId(lessonId);

        // Check if student can start attempt
        long submittedAttempts = attemptRepository.countSubmittedAttempts(quiz.getId(), student.getId());
        if (submittedAttempts >= quiz.getMaxAttempts()) {
            throw new RuntimeException("Đã đạt giới hạn số lần làm bài");
        }

        // Check if quiz is available
        Instant now = Instant.now();
        if (quiz.getStartDate() != null && now.isBefore(quiz.getStartDate())) {
            throw new RuntimeException("Quiz chưa mở");
        }
        if (quiz.getEndDate() != null && now.isAfter(quiz.getEndDate())) {
            throw new RuntimeException("Quiz đã đóng");
        }

        // Get questions
        List<Question> questions = getQuizQuestions(quiz);

        // Shuffle if needed
        List<UUID> questionOrder = questions.stream().map(Question::getId).collect(Collectors.toList());
        if (Boolean.TRUE.equals(quiz.getShuffleQuestions())) {
            Collections.shuffle(questionOrder);
        }

        // Create attempt
        QuizAttempt attempt = QuizAttempt.builder()
                .quiz(quiz)
                .student(student)
                .status(QuizAttempt.Status.IN_PROGRESS)
                .startTime(now)
                .totalQuestions(questions.size())
                .questionOrder(questionOrder.toString())
                .build();

        // Create attempt items
        for (UUID questionId : questionOrder) {
            Question question = questions.stream()
                    .filter(q -> q.getId().equals(questionId))
                    .findFirst().orElseThrow();

            QuizAttemptItem item = QuizAttemptItem.builder()
                    .attempt(attempt)
                    .question(question)
                    .build();

            attempt.getItems().add(item);
        }

        return attemptRepository.save(attempt);
    }

    private List<Question> getQuizQuestions(Quiz quiz) {
        if (quiz.getQuestionIds() != null && !quiz.getQuestionIds().isEmpty()) {
            // Manual selection
            List<UUID> ids = parseQuestionIds(quiz.getQuestionIds());
            return questionService.getQuestionsByIds(ids);
        } else {
            // Random selection - for now return all active questions
            // TODO: Implement random selection with filters
            return questionService.getActiveQuestions();
        }
    }

    private List<UUID> parseQuestionIds(String questionIds) {
        try {
            // Parse JSON array of UUIDs
            List<String> idStrings = objectMapper.readValue(questionIds, 
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
            return idStrings.stream()
                    .map(UUID::fromString)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            System.err.println("❌ Failed to parse question IDs JSON: " + questionIds);
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    @Transactional
    public QuizAttempt submitAttempt(UUID attemptId, Map<UUID, String> answers) {
        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        if (attempt.getStatus() != QuizAttempt.Status.IN_PROGRESS) {
            throw new RuntimeException("Attempt đã được nộp");
        }

        // Update answers
        for (QuizAttemptItem item : attempt.getItems()) {
            String selectedOption = answers.get(item.getQuestion().getId());
            item.setSelectedOption(selectedOption);
            item.setIsCorrect(selectedOption != null &&
                            selectedOption.equals(item.getQuestion().getCorrectOption()));
            if (item.getIsCorrect()) {
                attempt.setCorrectAnswers(attempt.getCorrectAnswers() + 1);
            }
        }

        // Calculate score
        double score = (double) attempt.getCorrectAnswers() / attempt.getTotalQuestions() * 100;
        attempt.setScore(score);
        attempt.setIsPassed(score >= attempt.getQuiz().getPassingScore());
        attempt.setStatus(QuizAttempt.Status.SUBMITTED);
        attempt.setEndTime(Instant.now());

        return attemptRepository.save(attempt);
    }

    public List<QuizAttempt> getStudentAttempts(UUID quizId, UUID studentId) {
        return attemptRepository.findByQuizIdAndStudentId(quizId, studentId);
    }

    public List<QuizAttempt> getQuizAttempts(UUID quizId) {
        return attemptRepository.findByQuizIdOrderByCreatedAtDesc(quizId);
    }
}