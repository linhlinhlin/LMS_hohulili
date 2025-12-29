package com.example.lms.service;

import com.example.lms.entity.Question;
import com.example.lms.entity.QuestionOption;
import com.example.lms.entity.User;
import com.example.lms.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.lms.domain.ContentBlock;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QuestionService {

    private final QuestionRepository questionRepository;

    @Transactional
    public Question createQuestion(User creator, String content, String correctOption,
                                 List<String> options, Question.Difficulty difficulty, String tags) {
        return createQuestion(creator, content, correctOption, options, difficulty, tags, null);
    }

    @Transactional
    public Question createQuestion(User creator, String content, String correctOption,
                                 List<String> options, Question.Difficulty difficulty, String tags, UUID courseId) {
        return createQuestion(creator, content, null, correctOption, options, null, difficulty, tags, courseId, null);
    }
    
    @Transactional
    public Question createQuestion(User creator, String content, String correctOption,
                                 List<String> options, Question.Difficulty difficulty, String tags, 
                                 UUID courseId, UUID packageId) {
         return createQuestion(creator, content, null, correctOption, options, null, difficulty, tags, courseId, packageId);
    }

    @Transactional
    // Master Create Method
    public Question createQuestion(User creator, String content, List<ContentBlock> contentBlocks,
                                 String correctOption, List<String> options, List<List<ContentBlock>> optionBlocks,
                                 Question.Difficulty difficulty, String tags, 
                                 UUID courseId, UUID packageId) {
        com.example.lms.entity.Course course = null;
        if (courseId != null) {
            course = com.example.lms.entity.Course.builder().id(courseId).build();
        }
        
        com.example.lms.entity.Package packageEntity = null;
        if (packageId != null) {
            packageEntity = com.example.lms.entity.Package.builder().id(packageId).build();
        }
        
        Question question = Question.builder()
                .correctOption(correctOption)
                .difficulty(difficulty)
                .tags(tags)
                .status(Question.Status.ACTIVE)
                .createdBy(creator)
                .course(course)
                .packageEntity(packageEntity)
                .build();

        // 1. Determine Content Blocks
        List<ContentBlock> finalContentBlocks;
        if (contentBlocks != null && !contentBlocks.isEmpty()) {
            finalContentBlocks = contentBlocks;
        } else {
            finalContentBlocks = createTextBlock(content);
        }
        
        // 2. Validate & Sanitize
        validateBlocks(finalContentBlocks);
        finalContentBlocks = sanitizeBlocks(finalContentBlocks);
        
        // 3. Set Content
        question.setContentBlocks(finalContentBlocks);

        // 4. Create options
        List<QuestionOption> questionOptions = new ArrayList<>();
        
        // Check if using blocks or legacy strings for options
        if (optionBlocks != null && !optionBlocks.isEmpty()) {
             for (int i = 0; i < optionBlocks.size(); i++) {
                List<ContentBlock> optBlocks = optionBlocks.get(i);
                
                validateBlocks(optBlocks);
                optBlocks = sanitizeBlocks(optBlocks);
                
                QuestionOption option = QuestionOption.builder()
                        .question(question)
                        .optionKey(String.valueOf((char)('A' + i)))
                        .contentBlocks(optBlocks)
                        .displayOrder(i)
                        .build();
                questionOptions.add(option);
            }
        } else if (options != null) {
            for (int i = 0; i < options.size(); i++) {
                List<ContentBlock> optBlocks = createTextBlock(options.get(i));
                // No need to validate generated block, but good practice to sanitize if input was HTML
                optBlocks = sanitizeBlocks(optBlocks);
                
                QuestionOption option = QuestionOption.builder()
                        .question(question)
                        .optionKey(String.valueOf((char)('A' + i)))
                        .contentBlocks(optBlocks)
                        .displayOrder(i)
                        .build();
                questionOptions.add(option);
            }
        }
        question.setOptions(questionOptions);

        return questionRepository.save(question);
    }

    @Transactional
    public Question updateQuestion(UUID id, String content, String correctOption,
                                 List<String> options, Question.Difficulty difficulty, String tags, Question.Status status) {
        return updateQuestion(id, content, null, correctOption, options, null, difficulty, tags, status);
    }
    
    @Transactional
    // Master Update Method
    public Question updateQuestion(UUID id, String content, List<ContentBlock> contentBlocks,
                                 String correctOption, List<String> options, List<List<ContentBlock>> optionBlocks,
                                 Question.Difficulty difficulty, String tags, Question.Status status) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found with id: " + id));
        
        // 1. Determine Content Blocks
        List<ContentBlock> finalContentBlocks;
        if (contentBlocks != null && !contentBlocks.isEmpty()) {
            finalContentBlocks = contentBlocks;
        } else {
            finalContentBlocks = createTextBlock(content);
        }
        
        // 2. Validate & Sanitize Content
        validateBlocks(finalContentBlocks);
        finalContentBlocks = sanitizeBlocks(finalContentBlocks);
        question.setContentBlocks(finalContentBlocks);
        
        question.setCorrectOption(correctOption);
        question.setDifficulty(difficulty);
        question.setTags(tags);
        question.setStatus(status);

        // Update options
        question.getOptions().clear();
        
        if (optionBlocks != null && !optionBlocks.isEmpty()) {
             for (int i = 0; i < optionBlocks.size(); i++) {
                List<ContentBlock> optBlocks = optionBlocks.get(i);
                
                validateBlocks(optBlocks);
                optBlocks = sanitizeBlocks(optBlocks);
                
                QuestionOption option = QuestionOption.builder()
                        .question(question)
                        .optionKey(String.valueOf((char)('A' + i)))
                        .contentBlocks(optBlocks)
                        .displayOrder(i)
                        .build();
                question.getOptions().add(option);
            }
        } else if (options != null) {
            for (int i = 0; i < options.size(); i++) {
                List<ContentBlock> optBlocks = createTextBlock(options.get(i));
                // Sanitize legacy input too
                optBlocks = sanitizeBlocks(optBlocks);
                
                QuestionOption option = QuestionOption.builder()
                        .question(question)
                        .optionKey(String.valueOf((char)('A' + i)))
                        .contentBlocks(optBlocks)
                        .displayOrder(i)
                        .build();
                question.getOptions().add(option);
            }
        }

        Question saved = questionRepository.save(question);
        // Force initialization of lazy relationships
        org.hibernate.Hibernate.initialize(saved.getCreatedBy());
        return saved;
    }

    @Transactional
    public void deleteQuestion(UUID id, User currentUser) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found with id: " + id));
        if (!question.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Không có quyền xóa câu hỏi này");
        }
        questionRepository.delete(question);
    }

    public List<Question> getQuestionsByCourse(UUID courseId, String status, User currentUser) {
        // TODO: Add permission check - verify user has access to this course
        System.out.println("🔍 Getting questions for course: " + courseId + " with status: " + status);
        
        try {
            Question.Status statusEnum = Question.Status.valueOf(status.toUpperCase());
            List<Question> questions = questionRepository.findByCourseIdAndStatus(courseId, statusEnum);
            System.out.println("✅ Found " + questions.size() + " questions for course " + courseId);
            return questions;
        } catch (IllegalArgumentException e) {
            // Invalid status, return active questions for this course
            List<Question> questions = questionRepository.findByCourseIdAndStatus(courseId, Question.Status.ACTIVE);
            System.out.println("✅ Found " + questions.size() + " ACTIVE questions for course " + courseId + " (fallback)");
            return questions;
        }
    }

    @Transactional(readOnly = true)
    public List<Question> getActiveQuestions() {
        return questionRepository.findByStatus(Question.Status.ACTIVE);
    }

    public List<Question> searchQuestions(Question.Status status, Question.Difficulty difficulty, String tags) {
        return questionRepository.findByFilters(status, difficulty, tags);
    }

    public List<Question> getQuestionsByIds(List<UUID> ids) {
        return questionRepository.findByIds(ids);
    }

    // NEW: Get all questions for a specific course
    public List<Question> getQuestionsByCourse(UUID courseId) {
        return questionRepository.findByCourseId(courseId);
    }

    // NEW: Get questions by course and status
    public List<Question> getQuestionsByCourseAndStatus(UUID courseId, Question.Status status) {
        return questionRepository.findByCourseIdAndStatus(courseId, status);
    }

    // NEW: Get questions by course and user
    public List<Question> getQuestionsByCourseAndUser(UUID courseId, UUID userId) {
        return questionRepository.findByCourseIdAndCreatedById(courseId, userId);
    }
    
    // NEW: Get questions by creator (for /my-questions)
    public List<Question> getQuestionsByCreator(User user, Question.Status status) {
        // Use eager-fetch method to avoid LazyInitializationException in Controller DTO conversion
        return questionRepository.findByCreatedByWithOptionsAndStatus(user, status);
    }

    // NEW: Get single question with permission check
    public Question getQuestionById(UUID id, User currentUser) {
        Question question = questionRepository.findByIdWithOptions(id)
                .orElseThrow(() -> new RuntimeException("Question not found with id: " + id));
        
        // Permission check: only creator or admin can view details for editing
        if (!question.getCreatedBy().getId().equals(currentUser.getId()) && 
            !currentUser.getRole().name().contains("ADMIN")) {
            throw new RuntimeException("Bạn không có quyền truy cập câu hỏi này");
        }
        return question;
    }

    // ================= HELPER METHODS for BLOCKS =================

    private List<ContentBlock> createTextBlock(String content) {
        if (content == null) content = "";
        return new ArrayList<>(Collections.singletonList(
                ContentBlock.builder()
                        .type("text")
                        .data(Map.of("html", content))
                        .build()
        ));
    }

    private void validateBlocks(List<ContentBlock> blocks) {
        if (blocks == null) return;
        for (ContentBlock block : blocks) {
            if (block.getType() == null || block.getType().trim().isEmpty()) {
                throw new IllegalArgumentException("Block type cannot be empty");
            }
            if (block.getData() == null) {
                 throw new IllegalArgumentException("Block data cannot be null");
            }
            // Add more specific validation if needed (e.g. check "text" has "html")
            if ("text".equals(block.getType()) && !block.getData().containsKey("html")) {
                throw new IllegalArgumentException("Text block must contain 'html' data");
            }
        }
    }

    private List<ContentBlock> sanitizeBlocks(List<ContentBlock> blocks) {
        if (blocks == null) return new ArrayList<>();
        List<ContentBlock> sanitized = new ArrayList<>();
        for (ContentBlock block : blocks) {
            if ("text".equals(block.getType())) {
                // Sanitize HTML
                String rawHtml = (String) block.getData().get("html");
                if (rawHtml != null) {
                    // Use basic safelist (allows b, i, p, etc.) or relaxed (allows images, tables)
                    // For rich text editor content, 'relaxed' is usually better, or custom.
                    // Here we use 'relaxed' to allow images/tables if embedded in HTML (though we prefer blocks for that)
                    // But actually, we want to prevent XSS.
                    String cleanHtml = Jsoup.clean(rawHtml, Safelist.relaxed());
                    
                    // Rebuild block with clean HTML
                    sanitized.add(ContentBlock.builder()
                            .type("text")
                            .data(Map.of("html", cleanHtml))
                            .build());
                } else {
                    sanitized.add(block);
                }
            } else {
                // For logic-based blocks (image, formula), just pass through or validate specific fields
                sanitized.add(block);
            }
        }
        return sanitized;
    }
}
