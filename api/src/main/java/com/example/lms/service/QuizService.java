package com.example.lms.service;

import com.example.lms.dto.QuizDTO;
import com.example.lms.entity.*;
import com.example.lms.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.Arrays;
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
    private final QuizQuestionRepository quizQuestionRepository;
    private final ObjectMapper objectMapper;
    
    @PersistenceContext
    private EntityManager entityManager;

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
        // First check if there are multiple quizzes
        List<Quiz> allQuizzes = quizRepository.findAllByLessonId(lessonId);
        if (allQuizzes.size() > 1) {
            System.err.println("⚠️ WARNING: Found " + allQuizzes.size() + " quizzes for lesson " + lessonId + ". Using the most recent one.");
            // Return the most recent one
            return quizRepository.findFirstByLessonIdOrderByCreatedAtDesc(lessonId)
                    .orElseThrow(() -> new RuntimeException("Quiz not found for lesson"));
        }
        
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
            // Remove all existing questions from this quiz
            List<QuizQuestion> existingQuestions = quizQuestionRepository.findByQuizIdOrderByDisplayOrderAsc(quiz.getId());
            quizQuestionRepository.deleteAll(existingQuestions);
            
            // Add new questions with proper display order
            if (questionIds != null && !questionIds.isEmpty()) {
                for (int i = 0; i < questionIds.size(); i++) {
                    UUID questionId = questionIds.get(i);
                    Question question = questionRepository.findById(questionId)
                            .orElseThrow(() -> new RuntimeException("Question not found: " + questionId));
                    
                    QuizQuestion quizQuestion = QuizQuestion.builder()
                            .quiz(quiz)
                            .question(question)
                            .displayOrder(i + 1)
                            .build();
                    
                    quizQuestionRepository.save(quizQuestion);
                }
            }
            
            long totalQuestions = quizQuestionRepository.countByQuizId(quiz.getId());
            System.out.println("✅ Updated quiz " + lessonId + " with " + totalQuestions + " questions using QuizQuestion table");
            
            return quiz;
        } catch (Exception e) {
            throw new RuntimeException("Failed to update quiz questions", e);
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
        System.out.println("🔍 DEBUG: Getting questions for quiz ID: " + quiz.getId());
        
        // USE ONLY QuizQuestion table approach (consistent with addQuestionToQuiz)
        List<QuizQuestion> quizQuestions = quizQuestionRepository.findByQuizIdOrderByDisplayOrderAsc(quiz.getId());
        System.out.println("🔍 DEBUG: Found " + quizQuestions.size() + " quiz-question relationships in table");
        
        List<Question> questions = quizQuestions.stream()
                .map(QuizQuestion::getQuestion)
                .collect(Collectors.toList());
                
        System.out.println("🔍 DEBUG: Returning " + questions.size() + " questions from QuizQuestion table");
        return questions;
    }

    private List<UUID> parseQuestionIds(String questionIdsJson) {
        try {
            if (questionIdsJson == null || questionIdsJson.trim().isEmpty()) {
                return new ArrayList<>();
            }
            
            // Clean and validate JSON
            String cleanJson = questionIdsJson.trim();
            
            // If it's not a proper JSON array, try to parse as direct UUID
            if (!cleanJson.startsWith("[")) {
                // Try to parse as single UUID
                try {
                    return Arrays.asList(UUID.fromString(cleanJson));
                } catch (IllegalArgumentException e) {
                    System.err.println("❌ Invalid question ID format: " + cleanJson);
                    return new ArrayList<>();
                }
            }
            
            // Parse as JSON array
            List<String> idStrings = objectMapper.readValue(cleanJson,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
            
            if (idStrings == null || idStrings.isEmpty()) {
                return new ArrayList<>();
            }
            
            return idStrings.stream()
                    .filter(id -> id != null && !id.trim().isEmpty())
                    .map(id -> {
                        try {
                            return UUID.fromString(id.trim());
                        } catch (IllegalArgumentException e) {
                            System.err.println("❌ Invalid UUID in array: " + id);
                            return null;
                        }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
                    
        } catch (Exception e) {
            System.err.println("❌ Failed to parse question IDs JSON: " + questionIdsJson);
            System.err.println("❌ Error type: " + e.getClass().getSimpleName());
            System.err.println("❌ Error message: " + e.getMessage());
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

    /**
     * Get detailed quiz results with correct/incorrect answers for student review
     */
    public QuizResultDetail getQuizResult(UUID attemptId, UUID studentId) {
        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        // Security check - student can only view their own results
        if (!attempt.getStudent().getId().equals(studentId)) {
            throw new RuntimeException("Access denied");
        }

        if (attempt.getStatus() != QuizAttempt.Status.SUBMITTED) {
            throw new RuntimeException("Quiz not yet submitted");
        }

        Quiz quiz = attempt.getQuiz();
        List<QuizResultItem> resultItems = new ArrayList<>();

        // Build detailed results for each question
        for (QuizAttemptItem item : attempt.getItems()) {
            Question question = item.getQuestion();
            
            QuizResultItem resultItem = QuizResultItem.builder()
                    .questionId(question.getId())
                    .questionContent(question.getContent())
                    .selectedOption(item.getSelectedOption())
                    .correctOption(question.getCorrectOption())
                    .isCorrect(item.getIsCorrect())
                    .options(question.getOptions())
                    .timeSpentSeconds(item.getTimeSpentSeconds())
                    .build();
            
            resultItems.add(resultItem);
        }

        return QuizResultDetail.builder()
                .attemptId(attempt.getId())
                .quizTitle(quiz.getLesson().getTitle())
                .studentName(attempt.getStudent().getFullName())
                .score(attempt.getScore())
                .totalQuestions(attempt.getTotalQuestions())
                .correctAnswers(attempt.getCorrectAnswers())
                .incorrectAnswers(attempt.getTotalQuestions() - attempt.getCorrectAnswers())
                .isPassed(attempt.getIsPassed())
                .passingScore(quiz.getPassingScore())
                .startTime(attempt.getStartTime())
                .endTime(attempt.getEndTime())
                .timeSpentSeconds(attempt.getTimeSpentSeconds())
                .showCorrectAnswers(quiz.getShowCorrectAnswers())
                .resultItems(resultItems)
                .build();
    }

    /**
     * Get quiz statistics for teacher dashboard
     */
    public QuizStatistics getQuizStatistics(UUID lessonId) {
        Quiz quiz = getQuizByLessonId(lessonId);
        List<QuizAttempt> allAttempts = attemptRepository.findByQuizIdOrderByCreatedAtDesc(quiz.getId());

        // Calculate statistics
        int totalAttempts = allAttempts.size();
        int completedAttempts = (int) allAttempts.stream()
                .filter(a -> a.getStatus() == QuizAttempt.Status.SUBMITTED)
                .count();
        
        double averageScore = allAttempts.stream()
                .filter(a -> a.getScore() != null)
                .mapToDouble(QuizAttempt::getScore)
                .average()
                .orElse(0.0);

        int passedCount = (int) allAttempts.stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsPassed()))
                .count();

        double passRate = completedAttempts > 0 ? (double) passedCount / completedAttempts * 100 : 0;

        // Question-level statistics
        Map<UUID, QuestionStatistic> questionStats = calculateQuestionStatistics(allAttempts);

        return QuizStatistics.builder()
                .quizId(quiz.getId())
                .quizTitle(quiz.getLesson().getTitle())
                .totalAttempts(totalAttempts)
                .completedAttempts(completedAttempts)
                .averageScore(averageScore)
                .passRate(passRate)
                .passingScore(quiz.getPassingScore())
                .questionStatistics(new ArrayList<>(questionStats.values()))
                .build();
    }

    private Map<UUID, QuestionStatistic> calculateQuestionStatistics(List<QuizAttempt> attempts) {
        Map<UUID, QuestionStatistic> stats = new HashMap<>();

        for (QuizAttempt attempt : attempts) {
            if (attempt.getStatus() != QuizAttempt.Status.SUBMITTED) continue;

            for (QuizAttemptItem item : attempt.getItems()) {
                UUID questionId = item.getQuestion().getId();
                QuestionStatistic stat = stats.computeIfAbsent(questionId, 
                    k -> QuestionStatistic.builder()
                            .questionId(k)
                            .questionContent(item.getQuestion().getContent())
                            .totalAttempts(0)
                            .correctAttempts(0)
                            .build());

                stat.setTotalAttempts(stat.getTotalAttempts() + 1);
                if (Boolean.TRUE.equals(item.getIsCorrect())) {
                    stat.setCorrectAttempts(stat.getCorrectAttempts() + 1);
                }
                stat.setCorrectRate(
                    stat.getTotalAttempts() > 0 ? 
                    (double) stat.getCorrectAttempts() / stat.getTotalAttempts() * 100 : 0
                );
            }
        }

        return stats;
    }

    // DTOs for enhanced results
    @Data
    @Builder
    public static class QuizResultDetail {
        private UUID attemptId;
        private String quizTitle;
        private String studentName;
        private Double score;
        private Integer totalQuestions;
        private Integer correctAnswers;
        private Integer incorrectAnswers;
        private Boolean isPassed;
        private Integer passingScore;
        private Instant startTime;
        private Instant endTime;
        private Long timeSpentSeconds;
        private Boolean showCorrectAnswers;
        private List<QuizResultItem> resultItems;
    }

    @Data
    @Builder
    public static class QuizResultItem {
        private UUID questionId;
        private String questionContent;
        private String selectedOption;
        private String correctOption;
        private Boolean isCorrect;
        private List<QuestionOption> options;
        private Long timeSpentSeconds;
    }

    @Data
    @Builder
    public static class QuizStatistics {
        private UUID quizId;
        private String quizTitle;
        private Integer totalAttempts;
        private Integer completedAttempts;
        private Double averageScore;
        private Double passRate;
        private Integer passingScore;
        private List<QuestionStatistic> questionStatistics;
    }

    @Data
    @Builder
    public static class QuestionStatistic {
        private UUID questionId;
        private String questionContent;
        private Integer totalAttempts;
        private Integer correctAttempts;
        private Double correctRate;
    }

    /**
     * Get all quizzes created by an instructor
     */
    public List<Quiz> getQuizzesByInstructorId(UUID instructorId) {
        return quizRepository.findByInstructorId(instructorId);
    }

    /**
     * Add a single question to an existing quiz
     */
    @Transactional(readOnly = true)
    public List<QuizDTO> getQuizDTOsByInstructorId(UUID instructorId) {
        List<Quiz> quizzes = quizRepository.findByInstructorId(instructorId);
        return quizzes.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    private QuizDTO convertToDTO(Quiz quiz) {
        return QuizDTO.builder()
                .id(quiz.getId())
                .lessonId(quiz.getLesson().getId())
                .lessonTitle(quiz.getLesson().getTitle())
                .sectionId(quiz.getLesson().getSection().getId())
                .sectionTitle(quiz.getLesson().getSection().getTitle())
                .courseId(quiz.getLesson().getSection().getCourse().getId())
                .courseTitle(quiz.getLesson().getSection().getCourse().getTitle())
                .courseCode(quiz.getLesson().getSection().getCourse().getCode())
                .timeLimitMinutes(quiz.getTimeLimitMinutes())
                .maxAttempts(quiz.getMaxAttempts())
                .passingScore(quiz.getPassingScore())
                .shuffleQuestions(quiz.getShuffleQuestions())
                .shuffleOptions(quiz.getShuffleOptions())
                .showResultsImmediately(quiz.getShowResultsImmediately())
                .showCorrectAnswers(quiz.getShowCorrectAnswers())
                .startDate(quiz.getStartDate())
                .endDate(quiz.getEndDate())
                .questionIds(quiz.getQuestionIds())
                .randomCount(quiz.getRandomCount())
                .randomDifficulties(quiz.getRandomDifficulties())
                .randomTags(quiz.getRandomTags())
                .createdAt(quiz.getCreatedAt())
                .updatedAt(quiz.getUpdatedAt())
                .totalAttempts(quiz.getAttempts() != null ? quiz.getAttempts().size() : 0)
                .averageScore(calculateAverageScore(quiz.getAttempts()))
                .build();
    }
    
    private Double calculateAverageScore(List<QuizAttempt> attempts) {
        if (attempts == null || attempts.isEmpty()) {
            return null;
        }
        
        return attempts.stream()
                .filter(attempt -> attempt.getScore() != null)
                .mapToDouble(QuizAttempt::getScore)
                .average()
                .orElse(0.0);
    }

    @Transactional
    public Quiz addQuestionToQuiz(UUID lessonId, UUID questionId) {
        try {
            Quiz quiz = quizRepository.findByLessonId(lessonId)
                    .orElseThrow(() -> new RuntimeException("Quiz not found for lesson"));
            
            System.out.println("🔍 Adding question " + questionId + " to quiz " + quiz.getId());
            
            // Check if question already exists in this quiz
            boolean exists = quizQuestionRepository.findByQuizIdAndQuestionId(quiz.getId(), questionId).isPresent();
            if (exists) {
                throw new RuntimeException("Câu hỏi đã tồn tại trong quiz");
            }
            
            // Get question to validate it exists
            Question question = questionRepository.findById(questionId)
                    .orElseThrow(() -> new RuntimeException("Question not found: " + questionId));
            
            // Get next display order
            Integer maxOrder = quizQuestionRepository.findMaxDisplayOrderByQuizId(quiz.getId());
            int nextOrder = (maxOrder != null) ? maxOrder + 1 : 1;
            
            // Create QuizQuestion relationship
            QuizQuestion quizQuestion = QuizQuestion.builder()
                    .quiz(quiz)
                    .question(question)
                    .displayOrder(nextOrder)
                    .build();
            
            quizQuestionRepository.save(quizQuestion);
            
            long totalQuestions = quizQuestionRepository.countByQuizId(quiz.getId());
            System.out.println("✅ Added question to quiz. Total questions: " + totalQuestions);
            
            return quiz;
        } catch (Exception e) {
            throw new RuntimeException("Failed to add question to quiz", e);
        }
    }

    @Transactional
    public Quiz removeQuestionFromQuiz(UUID lessonId, UUID questionId) {
        try {
            Quiz quiz = quizRepository.findByLessonId(lessonId)
                    .orElseThrow(() -> new RuntimeException("Quiz not found for lesson"));
            
            System.out.println("🔍 DEBUG - Removing question " + questionId + " from quiz " + quiz.getId());
            
            // Find and delete the QuizQuestion relationship
            QuizQuestion quizQuestion = quizQuestionRepository.findByQuizIdAndQuestionId(quiz.getId(), questionId)
                    .orElseThrow(() -> new RuntimeException("Question not found in quiz"));
            
            quizQuestionRepository.delete(quizQuestion);
            
            // Get updated count
            long totalQuestions = quizQuestionRepository.countByQuizId(quiz.getId());
            
            System.out.println("✅ Removed question " + questionId + " from quiz " + quiz.getId());
            System.out.println("   Remaining questions in quiz: " + totalQuestions);
            
            return quiz;
        } catch (Exception e) {
            throw new RuntimeException("Failed to remove question from quiz", e);
        }
    }

    @Transactional
    public void deleteQuizWithAllQuestions(UUID lessonId) {
        try {
            Quiz quiz = quizRepository.findByLessonId(lessonId)
                    .orElseThrow(() -> new RuntimeException("Quiz not found for lesson"));
            
            System.out.println("🔍 DEBUG - Deleting quiz " + quiz.getId() + " with all questions");
            
            // Delete all QuizQuestion relationships (cascade should handle this)
            List<QuizQuestion> quizQuestions = quizQuestionRepository.findByQuizIdOrderByDisplayOrderAsc(quiz.getId());
            System.out.println("🔍 DEBUG - Found " + quizQuestions.size() + " questions to delete");
            
            // Delete the quiz (cascade will delete quiz questions and attempts)
            quizRepository.delete(quiz);
            
            System.out.println("✅ Deleted quiz " + quiz.getId() + " and all associated data");
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete quiz", e);
        }
    }
}