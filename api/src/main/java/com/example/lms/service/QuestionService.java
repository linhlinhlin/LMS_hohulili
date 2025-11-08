package com.example.lms.service;

import com.example.lms.entity.Question;
import com.example.lms.entity.QuestionOption;
import com.example.lms.entity.User;
import com.example.lms.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
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
        com.example.lms.entity.Course course = null;
        if (courseId != null) {
            course = com.example.lms.entity.Course.builder().id(courseId).build();
        }
        
        Question question = Question.builder()
                .content(content)
                .correctOption(correctOption)
                .difficulty(difficulty)
                .tags(tags)
                .status(Question.Status.ACTIVE)  // Default to ACTIVE instead of DRAFT
                .createdBy(creator)
                .course(course)
                .build();

        // Create options
        for (int i = 0; i < options.size(); i++) {
            QuestionOption option = QuestionOption.builder()
                    .question(question)
                    .optionKey(String.valueOf((char)('A' + i)))
                    .content(options.get(i))
                    .displayOrder(i)
                    .build();
            question.getOptions().add(option);
        }

        return questionRepository.save(question);
    }

    public List<Question> getQuestionsByCreatorAndStatus(User creator, Question.Status status) {
        return questionRepository.findByCreatedByIdAndStatus(creator.getId(), status);
    }

    public List<Question> getQuestionsByCreator(User creator) {
        return questionRepository.findByCreatedById(creator.getId());
    }

    public List<Question> getActiveQuestions() {
        return questionRepository.findByStatus(Question.Status.ACTIVE);
    }

    public Question getQuestionById(UUID id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found"));
    }

    @Transactional
    public Question updateQuestion(UUID id, String content, String correctOption,
                                 List<String> options, Question.Difficulty difficulty, String tags, Question.Status status) {
        Question question = getQuestionById(id);
        question.setContent(content);
        question.setCorrectOption(correctOption);
        question.setDifficulty(difficulty);
        question.setTags(tags);
        question.setStatus(status);

        // Update options
        question.getOptions().clear();
        for (int i = 0; i < options.size(); i++) {
            QuestionOption option = QuestionOption.builder()
                    .question(question)
                    .optionKey(String.valueOf((char)('A' + i)))
                    .content(options.get(i))
                    .displayOrder(i)
                    .build();
            question.getOptions().add(option);
        }

        return questionRepository.save(question);
    }

    @Transactional
    public void deleteQuestion(UUID id, User currentUser) {
        Question question = getQuestionById(id);
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
}