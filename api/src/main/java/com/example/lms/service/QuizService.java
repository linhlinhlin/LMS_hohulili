package com.example.lms.service;

import com.example.lms.dto.QuizDTO;
import com.example.lms.domain.ContentBlock;
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
    private final LessonProgressDomainService progressDomainService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    
    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public Quiz createQuiz(Lesson lesson, List<UUID> questionIds, Integer timeLimitMinutes,
                          Integer maxAttempts, Integer passingScore, Boolean shuffleQuestions,
                          Boolean shuffleOptions, Boolean showResultsImmediately,
                          Boolean showCorrectAnswers, Instant startDate, Instant endDate) {
        try {
            System.out.println("🔍 DEBUG createQuiz - Lesson: " + lesson.getId());
            System.out.println("🔍 DEBUG createQuiz - questionIds: " + questionIds);
            System.out.println("🔍 DEBUG createQuiz - questionIds size: " + (questionIds != null ? questionIds.size() : "null"));
            
            // Get creator from course teacher
            User creator = lesson.getChapter().getCourse().getTeacher();

            // Find valid section for quiz
            Section quizSection = lesson.getSections().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Lesson of type QUIZ must have a content Section"));

            
            Quiz quiz = Quiz.builder()
                    .section(quizSection) // Updated from lesson(lesson)
                    .title(lesson.getTitle()) // Set title from lesson to satisfy NOT NULL constraint
                    .createdBy(creator) // Set created_by from course teacher
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

            Quiz savedQuiz = quizRepository.save(quiz);
            
            // Add questions to quiz_questions table (the proper way)
            if (questionIds != null && !questionIds.isEmpty()) {
                System.out.println("📝 Adding " + questionIds.size() + " questions to quiz " + savedQuiz.getId());
                for (int i = 0; i < questionIds.size(); i++) {
                    UUID questionId = questionIds.get(i);
                    Question question = questionRepository.findById(questionId)
                            .orElse(null);
                    
                    if (question != null) {
                        QuizQuestion quizQuestion = QuizQuestion.builder()
                                .quiz(savedQuiz)
                                .question(question)
                                .displayOrder(i + 1)
                                .build();
                        quizQuestionRepository.save(quizQuestion);
                    } else {
                        System.err.println("⚠️ Question not found: " + questionId);
                    }
                }
                System.out.println("✅ Added questions to quiz_questions table");
            }
            
            return savedQuiz;
        } catch (Exception e) {
            throw new RuntimeException("Failed to create quiz", e);
        }
    }

    public Quiz getQuizByLessonId(UUID lessonId) {
        // Always use findFirstByLessonIdOrderByCreatedAtDesc to handle potential duplicate quizzes
        // This ensures we always get the most recent quiz if there are duplicates
        List<Quiz> allQuizzes = quizRepository.findAllByLessonId(lessonId);
        if (allQuizzes.size() > 1) {
            System.err.println("⚠️ WARNING: Found " + allQuizzes.size() + " quizzes for lesson " + lessonId + ". Using the most recent one.");
        }
        
        return quizRepository.findFirstByLessonIdOrderByCreatedAtDesc(lessonId)
                .orElseThrow(() -> new RuntimeException("Quiz not found for lesson: " + lessonId));
    }

    @Transactional(readOnly = true)
    public List<Question> getQuizQuestions(UUID lessonId) {
        System.out.println("🔍 getQuizQuestions called for lessonId: " + lessonId);
        Quiz quiz = getQuizByLessonId(lessonId);
        System.out.println("🔍 Found quiz: " + quiz.getId());
        List<Question> questions = getQuizQuestions(quiz);
        System.out.println("🔍 Returning " + questions.size() + " questions");
        return questions;
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
                .map(qq -> {
                    Question q = qq.getQuestion();
                    // Force load options to avoid lazy loading issues
                    if (q.getOptions() != null) {
                        q.getOptions().size(); // Force initialization
                    }
                    return q;
                })
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
        // NEW: Auto-update StudentLessonProgress if quiz passed
        if (Boolean.TRUE.equals(attempt.getIsPassed())) {
            Lesson lesson = attempt.getQuiz().getSection().getLesson(); 
            User student = attempt.getStudent();
            
            try {
                progressDomainService.completeLesson(student, lesson);
                System.out.printf("✅ Quiz completed and progress updated - Student: %s, Lesson: %s, Score: %.1f%n", 
                        student.getId(), lesson.getId(), score);
            } catch (Exception e) {
                System.err.printf("❌ Failed to update progress after quiz completion - Student: %s, Lesson: %s, Error: %s%n", 
                        student.getId(), lesson.getId(), e.getMessage());
                // Don't throw exception, let the quiz submission succeed
            }
        }

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
                .quizTitle(quiz.getSection().getLesson().getTitle()) // updated from quiz.getLesson().getTitle()
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
                .quizTitle(quiz.getSection().getLesson().getTitle()) // updated
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

        public static QuizResultDetailBuilder builder() { return new QuizResultDetailBuilder(); }
        public static class QuizResultDetailBuilder {
            private QuizResultDetail d = new QuizResultDetail();
            public QuizResultDetailBuilder attemptId(UUID id) { d.setAttemptId(id); return this; }
            public QuizResultDetailBuilder quizTitle(String t) { d.setQuizTitle(t); return this; }
            public QuizResultDetailBuilder studentName(String n) { d.setStudentName(n); return this; }
            public QuizResultDetailBuilder score(Double s) { d.setScore(s); return this; }
            public QuizResultDetailBuilder totalQuestions(Integer t) { d.setTotalQuestions(t); return this; }
            public QuizResultDetailBuilder correctAnswers(Integer c) { d.setCorrectAnswers(c); return this; }
            public QuizResultDetailBuilder incorrectAnswers(Integer i) { d.setIncorrectAnswers(i); return this; }
            public QuizResultDetailBuilder isPassed(Boolean p) { d.setIsPassed(p); return this; }
            public QuizResultDetailBuilder passingScore(Integer s) { d.setPassingScore(s); return this; }
            public QuizResultDetailBuilder startTime(Instant s) { d.setStartTime(s); return this; }
            public QuizResultDetailBuilder endTime(Instant e) { d.setEndTime(e); return this; }
            public QuizResultDetailBuilder timeSpentSeconds(Long t) { d.setTimeSpentSeconds(t); return this; }
            public QuizResultDetailBuilder showCorrectAnswers(Boolean s) { d.setShowCorrectAnswers(s); return this; }
            public QuizResultDetailBuilder resultItems(List<QuizResultItem> r) { d.setResultItems(r); return this; }
            public QuizResultDetail build() { return d; }
        }

        public UUID getAttemptId() { return attemptId; }
        public void setAttemptId(UUID attemptId) { this.attemptId = attemptId; }
        public String getQuizTitle() { return quizTitle; }
        public void setQuizTitle(String quizTitle) { this.quizTitle = quizTitle; }
        public String getStudentName() { return studentName; }
        public void setStudentName(String studentName) { this.studentName = studentName; }
        public Double getScore() { return score; }
        public void setScore(Double score) { this.score = score; }
        public Integer getTotalQuestions() { return totalQuestions; }
        public void setTotalQuestions(Integer totalQuestions) { this.totalQuestions = totalQuestions; }
        public Integer getCorrectAnswers() { return correctAnswers; }
        public void setCorrectAnswers(Integer correctAnswers) { this.correctAnswers = correctAnswers; }
        public Integer getIncorrectAnswers() { return incorrectAnswers; }
        public void setIncorrectAnswers(Integer incorrectAnswers) { this.incorrectAnswers = incorrectAnswers; }
        public Boolean getIsPassed() { return isPassed; }
        public void setIsPassed(Boolean isPassed) { this.isPassed = isPassed; }
        public Integer getPassingScore() { return passingScore; }
        public void setPassingScore(Integer passingScore) { this.passingScore = passingScore; }
        public Instant getStartTime() { return startTime; }
        public void setStartTime(Instant startTime) { this.startTime = startTime; }
        public Instant getEndTime() { return endTime; }
        public void setEndTime(Instant endTime) { this.endTime = endTime; }
        public Long getTimeSpentSeconds() { return timeSpentSeconds; }
        public void setTimeSpentSeconds(Long timeSpentSeconds) { this.timeSpentSeconds = timeSpentSeconds; }
        public Boolean getShowCorrectAnswers() { return showCorrectAnswers; }
        public void setShowCorrectAnswers(Boolean showCorrectAnswers) { this.showCorrectAnswers = showCorrectAnswers; }
        public List<QuizResultItem> getResultItems() { return resultItems; }
        public void setResultItems(List<QuizResultItem> resultItems) { this.resultItems = resultItems; }
    }

    public static class QuizResultItem {
        private UUID questionId;
        private String questionContent;
        private String selectedOption;
        private String correctOption;
        private Boolean isCorrect;
        private List<QuestionOption> options;
        private Long timeSpentSeconds;

        public static QuizResultItemBuilder builder() { return new QuizResultItemBuilder(); }
        public static class QuizResultItemBuilder {
            private QuizResultItem i = new QuizResultItem();
            public QuizResultItemBuilder questionId(UUID id) { i.setQuestionId(id); return this; }
            public QuizResultItemBuilder questionContent(String c) { i.setQuestionContent(c); return this; }
            public QuizResultItemBuilder selectedOption(String s) { i.setSelectedOption(s); return this; }
            public QuizResultItemBuilder correctOption(String c) { i.setCorrectOption(c); return this; }
            public QuizResultItemBuilder isCorrect(Boolean b) { i.setIsCorrect(b); return this; }
            public QuizResultItemBuilder options(List<QuestionOption> o) { i.setOptions(o); return this; }
            public QuizResultItemBuilder timeSpentSeconds(Long t) { i.setTimeSpentSeconds(t); return this; }
            public QuizResultItem build() { return i; }
        }

        public UUID getQuestionId() { return questionId; }
        public void setQuestionId(UUID questionId) { this.questionId = questionId; }
        public String getQuestionContent() { return questionContent; }
        public void setQuestionContent(String questionContent) { this.questionContent = questionContent; }
        public String getSelectedOption() { return selectedOption; }
        public void setSelectedOption(String selectedOption) { this.selectedOption = selectedOption; }
        public String getCorrectOption() { return correctOption; }
        public void setCorrectOption(String correctOption) { this.correctOption = correctOption; }
        public Boolean getIsCorrect() { return isCorrect; }
        public void setIsCorrect(Boolean isCorrect) { this.isCorrect = isCorrect; }
        public List<QuestionOption> getOptions() { return options; }
        public void setOptions(List<QuestionOption> options) { this.options = options; }
        public Long getTimeSpentSeconds() { return timeSpentSeconds; }
        public void setTimeSpentSeconds(Long timeSpentSeconds) { this.timeSpentSeconds = timeSpentSeconds; }
    }

    public static class QuizStatistics {
        private UUID quizId;
        private String quizTitle;
        private Integer totalAttempts;
        private Integer completedAttempts;
        private Double averageScore;
        private Double passRate;
        private Integer passingScore;
        private List<QuestionStatistic> questionStatistics;

        public static QuizStatisticsBuilder builder() { return new QuizStatisticsBuilder(); }
        public static class QuizStatisticsBuilder {
            private QuizStatistics s = new QuizStatistics();
            public QuizStatisticsBuilder quizId(UUID id) { s.setQuizId(id); return this; }
            public QuizStatisticsBuilder quizTitle(String t) { s.setQuizTitle(t); return this; }
            public QuizStatisticsBuilder totalAttempts(Integer t) { s.setTotalAttempts(t); return this; }
            public QuizStatisticsBuilder completedAttempts(Integer c) { s.setCompletedAttempts(c); return this; }
            public QuizStatisticsBuilder averageScore(Double a) { s.setAverageScore(a); return this; }
            public QuizStatisticsBuilder passRate(Double p) { s.setPassRate(p); return this; }
            public QuizStatisticsBuilder passingScore(Integer p) { s.setPassingScore(p); return this; }
            public QuizStatisticsBuilder questionStatistics(List<QuestionStatistic> q) { s.setQuestionStatistics(q); return this; }
            public QuizStatistics build() { return s; }
        }

        public UUID getQuizId() { return quizId; }
        public void setQuizId(UUID quizId) { this.quizId = quizId; }
        public String getQuizTitle() { return quizTitle; }
        public void setQuizTitle(String quizTitle) { this.quizTitle = quizTitle; }
        public Integer getTotalAttempts() { return totalAttempts; }
        public void setTotalAttempts(Integer totalAttempts) { this.totalAttempts = totalAttempts; }
        public Integer getCompletedAttempts() { return completedAttempts; }
        public void setCompletedAttempts(Integer completedAttempts) { this.completedAttempts = completedAttempts; }
        public Double getAverageScore() { return averageScore; }
        public void setAverageScore(Double averageScore) { this.averageScore = averageScore; }
        public Double getPassRate() { return passRate; }
        public void setPassRate(Double passRate) { this.passRate = passRate; }
        public Integer getPassingScore() { return passingScore; }
        public void setPassingScore(Integer passingScore) { this.passingScore = passingScore; }
        public List<QuestionStatistic> getQuestionStatistics() { return questionStatistics; }
        public void setQuestionStatistics(List<QuestionStatistic> questionStatistics) { this.questionStatistics = questionStatistics; }
    }

    public static class QuestionStatistic {
        private UUID questionId;
        private String questionContent;
        private Integer totalAttempts;
        private Integer correctAttempts;
        private Double correctRate;

        public static QuestionStatisticBuilder builder() { return new QuestionStatisticBuilder(); }
        public static class QuestionStatisticBuilder {
            private QuestionStatistic s = new QuestionStatistic();
            public QuestionStatisticBuilder questionId(UUID id) { s.setQuestionId(id); return this; }
            public QuestionStatisticBuilder questionContent(String c) { s.setQuestionContent(c); return this; }
            public QuestionStatisticBuilder totalAttempts(Integer t) { s.setTotalAttempts(t); return this; }
            public QuestionStatisticBuilder correctAttempts(Integer c) { s.setCorrectAttempts(c); return this; }
            public QuestionStatisticBuilder correctRate(Double r) { s.setCorrectRate(r); return this; }
            public QuestionStatistic build() { return s; }
        }

        public UUID getQuestionId() { return questionId; }
        public void setQuestionId(UUID questionId) { this.questionId = questionId; }
        public String getQuestionContent() { return questionContent; }
        public void setQuestionContent(String questionContent) { this.questionContent = questionContent; }
        public Integer getTotalAttempts() { return totalAttempts; }
        public void setTotalAttempts(Integer totalAttempts) { this.totalAttempts = totalAttempts; }
        public Integer getCorrectAttempts() { return correctAttempts; }
        public void setCorrectAttempts(Integer correctAttempts) { this.correctAttempts = correctAttempts; }
        public Double getCorrectRate() { return correctRate; }
        public void setCorrectRate(Double correctRate) { this.correctRate = correctRate; }
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
        // Safely traverse relationships
        UUID lessonId = null;
        String lessonTitle = null;
        UUID sectionId = null;
        String sectionTitle = null;
        UUID courseId = null;
        String courseTitle = null;
        String courseCode = null;

        if (quiz.getSection() != null) {
            sectionId = quiz.getSection().getId();
            
            if (quiz.getSection().getLesson() != null) {
                lessonId = quiz.getSection().getLesson().getId();
                lessonTitle = quiz.getSection().getLesson().getTitle();
                
                if (quiz.getSection().getLesson().getChapter() != null) {
                    sectionId = quiz.getSection().getLesson().getChapter().getId(); // Note: DTO calls Chapter 'section' (legacy naming confusion?)
                    sectionTitle = quiz.getSection().getLesson().getChapter().getTitle();
                    
                    if (quiz.getSection().getLesson().getChapter().getCourse() != null) {
                        courseId = quiz.getSection().getLesson().getChapter().getCourse().getId();
                        courseTitle = quiz.getSection().getLesson().getChapter().getCourse().getTitle();
                        courseCode = quiz.getSection().getLesson().getChapter().getCourse().getCode();
                    }
                }
            }
        }
        
        return QuizDTO.builder()
                .id(quiz.getId())
                .lessonId(lessonId)
                .lessonTitle(lessonTitle)
                .sectionId(sectionId) // Actually Chapter ID in DTO?
                .sectionTitle(sectionTitle)
                .courseId(courseId)
                .courseTitle(courseTitle)
                .courseCode(courseCode)
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
            System.out.println("🔍 addQuestionToQuiz called - lessonId: " + lessonId + ", questionId: " + questionId);
            
            // Try to find existing quiz, or create one if not exists
            // Use findFirstByLessonIdOrderByCreatedAtDesc to handle duplicate quizzes
            Quiz quiz = quizRepository.findFirstByLessonIdOrderByCreatedAtDesc(lessonId).orElse(null);
            
            if (quiz == null) {
                System.out.println("⚠️ Quiz not found for lesson: " + lessonId + ". Creating new quiz...");
                // Need to get lesson to create quiz
                Lesson lesson = entityManager.find(Lesson.class, lessonId);
                if (lesson == null) {
                    throw new RuntimeException("Lesson not found: " + lessonId);
                }
                
                // Create quiz with default settings
                quiz = createQuiz(lesson, null, 30, 1, 60, false, false, true, true, null, null);
                System.out.println("✅ Created new quiz: " + quiz.getId() + " for lesson: " + lessonId);
            }
            
            System.out.println("🔍 Using quiz: " + quiz.getId() + " for lesson: " + lessonId);
            
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
            System.err.println("❌ Exception in addQuestionToQuiz: " + e.getClass().getName() + " - " + e.getMessage());
            e.printStackTrace();
            if (e instanceof RuntimeException) {
                throw (RuntimeException) e;
            }
            throw new RuntimeException("Failed to add question to quiz: " + e.getMessage(), e);
        }
    }

    @Transactional
    public Quiz removeQuestionFromQuiz(UUID lessonId, UUID questionId) {
        try {
            // Use getQuizByLessonId to handle duplicate quizzes
            Quiz quiz = getQuizByLessonId(lessonId);
            
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
            // Use getQuizByLessonId to handle duplicate quizzes
            Quiz quiz = getQuizByLessonId(lessonId);
            
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

    /**
     * Update quiz settings
     */
    @Transactional
    public Quiz updateQuizSettings(UUID quizId, String title, Integer timeLimitMinutes,
                                   Integer maxAttempts, Integer passingScore,
                                   Boolean shuffleQuestions, Boolean shuffleOptions,
                                   Boolean showResultsImmediately, Boolean showCorrectAnswers) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new RuntimeException("Quiz not found: " + quizId));

        // Update fields if provided
        if (title != null && !title.trim().isEmpty()) {
            quiz.setTitle(title);
        }
        if (timeLimitMinutes != null) {
            quiz.setTimeLimitMinutes(timeLimitMinutes);
        }
        if (maxAttempts != null) {
            quiz.setMaxAttempts(maxAttempts);
        }
        if (passingScore != null) {
            quiz.setPassingScore(passingScore);
        }
        if (shuffleQuestions != null) {
            quiz.setShuffleQuestions(shuffleQuestions);
        }
        if (shuffleOptions != null) {
            quiz.setShuffleOptions(shuffleOptions);
        }
        if (showResultsImmediately != null) {
            quiz.setShowResultsImmediately(showResultsImmediately);
        }
        if (showCorrectAnswers != null) {
            quiz.setShowCorrectAnswers(showCorrectAnswers);
        }

        return quizRepository.save(quiz);
    }

    /**
     * Get the count of questions in a quiz
     */
    public long getQuizQuestionCount(UUID quizId) {
        return quizQuestionRepository.countByQuizId(quizId);
    }

    /**
     * Clean up duplicate quizzes - keep only the most recent one for each lesson
     */
    @Transactional
    public Map<String, Object> cleanupDuplicateQuizzes() {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> duplicatesFound = new ArrayList<>();
        int totalDeleted = 0;

        // Find all lessons with multiple quizzes
        List<Quiz> allQuizzes = quizRepository.findAll();
        
        // Filter only for LESSON_QUIZ and group (safely)
        Map<UUID, List<Quiz>> quizzesByLesson = allQuizzes.stream()
                .filter(q -> q.getType() == Quiz.QuizType.LESSON_QUIZ && q.getSection() != null && q.getSection().getLesson() != null)
                .collect(Collectors.groupingBy(q -> q.getSection().getLesson().getId()));

        for (Map.Entry<UUID, List<Quiz>> entry : quizzesByLesson.entrySet()) {
            List<Quiz> quizzes = entry.getValue();
            if (quizzes.size() > 1) {
                UUID lessonId = entry.getKey();
                
                // Sort by created_at DESC to keep the most recent
                quizzes.sort((a, b) -> {
                    if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                });

                Quiz keepQuiz = quizzes.get(0); // Most recent
                List<Quiz> deleteQuizzes = quizzes.subList(1, quizzes.size());

                Map<String, Object> duplicateInfo = new HashMap<>();
                duplicateInfo.put("lessonId", lessonId);
                duplicateInfo.put("totalQuizzes", quizzes.size());
                duplicateInfo.put("keptQuizId", keepQuiz.getId());
                duplicateInfo.put("deletedQuizIds", deleteQuizzes.stream().map(Quiz::getId).collect(Collectors.toList()));

                // Delete the older quizzes
                for (Quiz deleteQuiz : deleteQuizzes) {
                    // Delete quiz questions first
                    quizQuestionRepository.deleteByQuizId(deleteQuiz.getId());
                    // Delete the quiz
                    quizRepository.delete(deleteQuiz);
                    totalDeleted++;
                }

                duplicatesFound.add(duplicateInfo);
                System.out.println("✅ Cleaned up " + deleteQuizzes.size() + " duplicate quizzes for lesson: " + lessonId);
            }
        }

        result.put("duplicatesFound", duplicatesFound.size());
        result.put("totalQuizzesDeleted", totalDeleted);
        result.put("details", duplicatesFound);

        return result;
    }

    /**
     * Get all available questions for a teacher to add to quiz
     */
    public List<Question> getAvailableQuestions(UUID teacherId) {
        System.out.println("🔍 Getting available questions for teacher: " + teacherId);
        
        // Get all questions created by this teacher
        List<Question> questions = questionRepository.findByCreatedById(teacherId);
        
        System.out.println("📊 Found " + questions.size() + " questions created by teacher");
        
        return questions;
    }

    /**
     * Auto-populate quiz with available questions from teacher
     */
    @Transactional
    public Map<String, Object> autoPopulateQuizQuestions(UUID lessonId, UUID teacherId) {
        System.out.println("🔍 Auto-populating quiz for lesson: " + lessonId + " by teacher: " + teacherId);
        
        Quiz quiz = getQuizByLessonId(lessonId);
        
        // Get available questions from teacher
        List<Question> availableQuestions = getAvailableQuestions(teacherId);
        
        System.out.println("📊 Found " + availableQuestions.size() + " available questions");
        
        if (availableQuestions.isEmpty()) {
            System.out.println("⚠️ No available questions found for teacher");
            Map<String, Object> result = new HashMap<>();
            result.put("quizId", quiz.getId());
            result.put("lessonId", lessonId);
            result.put("addedCount", 0);
            result.put("message", "Không có câu hỏi nào để thêm");
            return result;
        }
        
        // Add all available questions to quiz
        int addedCount = 0;
        for (int i = 0; i < availableQuestions.size(); i++) {
            Question question = availableQuestions.get(i);
            
            // Check if question already exists in this quiz
            boolean exists = quizQuestionRepository.findByQuizIdAndQuestionId(quiz.getId(), question.getId()).isPresent();
            if (!exists) {
                QuizQuestion quizQuestion = QuizQuestion.builder()
                        .quiz(quiz)
                        .question(question)
                        .displayOrder(i + 1)
                        .build();
                quizQuestionRepository.save(quizQuestion);
                addedCount++;
            }
        }
        
        System.out.println("✅ Added " + addedCount + " questions to quiz");
        
        Map<String, Object> result = new HashMap<>();
        result.put("quizId", quiz.getId());
        result.put("lessonId", lessonId);
        result.put("addedCount", addedCount);
        result.put("totalQuestions", quizQuestionRepository.countByQuizId(quiz.getId()));
        result.put("message", "Đã thêm " + addedCount + " câu hỏi vào quiz");
        
        return result;
    }

    /**
     * Create sample questions for a lesson
     */
    @Transactional
    public Map<String, Object> createSampleQuestions(Lesson lesson, User teacher) {
        System.out.println("🔍 Creating sample questions for lesson: " + lesson.getId());
        
        List<Question> createdQuestions = new ArrayList<>();
        
        // Create 5 sample questions
        String[][] sampleData = {
            {"Câu hỏi 1: Đây là câu hỏi mẫu đầu tiên", "A", "B", "C", "D", "A"},
            {"Câu hỏi 2: Đây là câu hỏi mẫu thứ hai", "Đúng", "Sai", "Không chắc", "Khác", "A"},
            {"Câu hỏi 3: Đây là câu hỏi mẫu thứ ba", "Tùy chọn 1", "Tùy chọn 2", "Tùy chọn 3", "Tùy chọn 4", "B"},
            {"Câu hỏi 4: Đây là câu hỏi mẫu thứ tư", "Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D", "C"},
            {"Câu hỏi 5: Đây là câu hỏi mẫu thứ năm", "Phương án 1", "Phương án 2", "Phương án 3", "Phương án 4", "D"}
        };
        
        for (String[] data : sampleData) {
            Question question = Question.builder()
                    .contentBlocks(ContentBlock.fromText(data[0]))
                    .difficulty(Question.Difficulty.MEDIUM)
                    .status(Question.Status.ACTIVE)
                    .correctOption(data[5])
                    .createdBy(teacher)
                    .course(lesson.getChapter().getCourse())
                    .build();
            
            // Create options
            List<QuestionOption> options = new ArrayList<>();
            String[] optionKeys = {"A", "B", "C", "D"};
            for (int i = 0; i < 4; i++) {
                QuestionOption option = QuestionOption.builder()
                        .question(question)
                        .optionKey(optionKeys[i])
                        .contentBlocks(ContentBlock.fromText(data[i + 1]))
                        .displayOrder(i + 1)
                        .build();
                options.add(option);
            }
            question.setOptions(options);
            
            Question savedQuestion = questionRepository.save(question);
            createdQuestions.add(savedQuestion);
            System.out.println("✅ Created sample question: " + savedQuestion.getId());
        }
        
        // Add all created questions to quiz
        Quiz quiz = getQuizByLessonId(lesson.getId());
        int addedCount = 0;
        for (int i = 0; i < createdQuestions.size(); i++) {
            Question question = createdQuestions.get(i);
            
            QuizQuestion quizQuestion = QuizQuestion.builder()
                    .quiz(quiz)
                    .question(question)
                    .displayOrder(i + 1)
                    .build();
            quizQuestionRepository.save(quizQuestion);
            addedCount++;
        }
        
        System.out.println("✅ Added " + addedCount + " sample questions to quiz");
        
        Map<String, Object> result = new HashMap<>();
        result.put("quizId", quiz.getId());
        result.put("lessonId", lesson.getId());
        result.put("createdCount", createdQuestions.size());
        result.put("addedCount", addedCount);
        result.put("totalQuestions", quizQuestionRepository.countByQuizId(quiz.getId()));
        result.put("message", "Đã tạo " + createdQuestions.size() + " câu hỏi mẫu");
        
        return result;
    }
}
