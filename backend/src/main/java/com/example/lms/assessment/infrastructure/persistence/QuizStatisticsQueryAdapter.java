package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.application.port.QuizStatisticsQueryPort;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizAttemptJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAttemptJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class QuizStatisticsQueryAdapter implements QuizStatisticsQueryPort {

    private final QuizJpaRepositoryV3 quizJpaRepository;
    private final QuizAttemptJpaRepository attemptJpaRepository;

    @Override
    public List<QuizInfo> findQuizzesByLessonId(UUID lessonId) {
        return quizJpaRepository.findByLessonId(lessonId).stream()
                .map(q -> new QuizInfo(q.getId(), q.getTitle(), q.getPassingScore()))
                .collect(Collectors.toList());
    }

    @Override
    public List<AttemptInfo> findAttemptsByQuizIds(List<UUID> quizIds) {
        return attemptJpaRepository.findByQuizIdInOrderByCreatedAtDesc(quizIds).stream()
                .map(a -> new AttemptInfo(a.getId(), a.getQuizId(), a.getStatus().name(), a.getScore()))
                .collect(Collectors.toList());
    }
}
