package com.example.lms.assessment.domain.repository;

import com.example.lms.assessment.domain.model.Question;
import java.util.Optional;
import java.util.UUID;

public interface QuestionRepository {
    Question save(Question question);
    Optional<Question> findById(UUID id);
    void deleteById(UUID id);
}
