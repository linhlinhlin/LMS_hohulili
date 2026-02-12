package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.domain.model.QuizAttempt;
import com.example.lms.assessment.domain.repository.QuizAttemptRepository;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizAttemptJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAttemptJpaRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class QuizAttemptRepositoryAdapter implements QuizAttemptRepository {

    private final QuizAttemptJpaRepository jpaRepository;
    private final ObjectMapper objectMapper;

    @Override
    public QuizAttempt save(QuizAttempt attempt) {
        QuizAttemptJpaEntity entity;
        // Merge onto existing entity for updates — preserves @Version for optimistic locking
        if (attempt.getId() != null) {
            Optional<QuizAttemptJpaEntity> existing = jpaRepository.findById(attempt.getId());
            if (existing.isPresent()) {
                entity = existing.get();
                mergeToEntity(entity, attempt);
            } else {
                entity = toEntity(attempt);
            }
        } else {
            entity = toEntity(attempt);
        }
        QuizAttemptJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<QuizAttempt> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public List<QuizAttempt> findByQuizIdAndStudentId(UUID quizId, UUID studentId) {
        return jpaRepository.findByQuizIdAndStudentId(quizId, studentId).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<QuizAttempt> findByQuizId(UUID quizId) {
        return jpaRepository.findByQuizIdOrderByCreatedAtDesc(quizId).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    // ============ Mapping Methods ============

    /**
     * Merge domain model fields onto an existing JPA entity.
     * Preserves the entity's @Version field for optimistic locking.
     */
    private void mergeToEntity(QuizAttemptJpaEntity entity, QuizAttempt domain) {
        Map<String, Object> answersMap = new HashMap<>();
        if (domain.getItems() != null) {
            for (QuizAttempt.AttemptItem item : domain.getItems()) {
                answersMap.put(item.getQuestionId().toString(), item);
            }
        }
        entity.setStatus(QuizAttemptJpaEntity.AttemptStatus.valueOf(domain.getStatus().name()));
        entity.setScore(domain.getScore());
        entity.setStartedAt(domain.getStartTime());
        entity.setSubmittedAt(domain.getEndTime());
        entity.setAnswers(answersMap);
    }

    private QuizAttemptJpaEntity toEntity(QuizAttempt domain) {
        // Map List<AttemptItem> to Map<String, Object> for JSONB storage
        Map<String, Object> answersMap = new HashMap<>();
        if (domain.getItems() != null) {
            for (QuizAttempt.AttemptItem item : domain.getItems()) {
                // Store full item data as JSON value keyed by QuestionID
                answersMap.put(item.getQuestionId().toString(), item); 
            }
        }

        return QuizAttemptJpaEntity.builder()
            .id(domain.getId())
            .quizId(domain.getQuizId())
            .studentId(domain.getStudentId())
            .status(QuizAttemptJpaEntity.AttemptStatus.valueOf(domain.getStatus().name()))
            .score(domain.getScore())
            //.maxScore(100.0) // Needed? Domain score is usually %, or need raw points? Assuming % for now.
            .startedAt(domain.getStartTime())
            .submittedAt(domain.getEndTime())
            .answers(answersMap) 
            .build();
    }

    private QuizAttempt toDomain(QuizAttemptJpaEntity entity) {
        List<QuizAttempt.AttemptItem> items = new ArrayList<>();
        
        if (entity.getAnswers() != null) {
            for (Map.Entry<String, Object> entry : entity.getAnswers().entrySet()) {
                try {
                    // Convert JSON map value back to AttemptItem
                    QuizAttempt.AttemptItem item = objectMapper.convertValue(entry.getValue(), QuizAttempt.AttemptItem.class);
                     // Ensure QuestionID is set (if it wasn't in the value object)
                    if (item.getQuestionId() == null) {
                       // Reconstruct if needed, but if we stored whole object it should be there.
                       // Ideally, we trust the JSON payload.
                    }
                    items.add(item);
                } catch (IllegalArgumentException e) {
                    log.error("Failed to deserialize AttemptItem for attempt {}", entity.getId(), e);
                }
            }
        }

        // Domain Builder needs explicit mapping
        QuizAttempt attempt = QuizAttempt.builder()
                .id(entity.getId())
                .quizId(entity.getQuizId())
                .studentId(entity.getStudentId())
                .startTime(entity.getStartedAt())
                .endTime(entity.getSubmittedAt())
                .score(entity.getScore())
                .isPassed(entity.getScore() != null && entity.getScore() >= 60) // Logic actually in Domain/UseCase?
                // Reconstruct items
                .items(items)
                .status(QuizAttempt.AttemptStatus.valueOf(entity.getStatus().name()))
                .build();
                
        return attempt;
    }
}
