package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.assessment.infrastructure.persistence.entity.QuizAttemptJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAttemptJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.learning_delivery.application.port.CertificateEligibilityPort;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import com.example.lms.shared.domain.model.ContentBlock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class CertificateEligibilityJpaAdapter implements CertificateEligibilityPort {

    private final JpaEnrollmentRepository enrollmentRepository;
    private final LessonJpaRepository lessonJpaRepository;
    private final QuizJpaRepositoryV3 quizJpaRepository;
    private final QuizAttemptJpaRepository quizAttemptJpaRepository;

    @Override
    @Transactional(readOnly = true)
    public EligibilityResult evaluate(UUID enrollmentId, UUID studentId, UUID courseId) {
        EnrollmentJpaEntity enrollment = enrollmentRepository.findById(enrollmentId)
                .filter(entity -> studentId.equals(entity.getStudentId()))
                .filter(entity -> entity.getLearningClass() != null && courseId.equals(entity.getLearningClass().getCourseId()))
                .orElse(null);

        if (enrollment == null) {
            return EligibilityResult.denied("Không tìm thấy tiến độ học phù hợp để cấp chứng chỉ.");
        }

        List<LessonJpaEntity> lessons = lessonJpaRepository.findByCourseIdOrderByChapterAndLesson(courseId);
        if (lessons.isEmpty()) {
            return EligibilityResult.allowed();
        }

        List<UUID> lessonIds = lessons.stream()
                .map(LessonJpaEntity::getId)
                .toList();

        List<QuizJpaEntity> certificateLessonExams = quizJpaRepository.findByLessonIdIn(lessonIds).stream()
                .filter(quiz -> quiz.getStatus() == QuizJpaEntity.QuizStatus.PUBLISHED)
                .filter(quiz -> quiz.getAssessmentType() == QuizJpaEntity.AssessmentType.EXAM)
                .filter(quiz -> Boolean.TRUE.equals(quiz.getCountsTowardCertificate()))
                .toList();

        Set<UUID> passedQuizIds = loadPassedLessonQuizIds(studentId, certificateLessonExams);
        List<String> missingRequirements = new ArrayList<>();

        for (QuizJpaEntity quiz : certificateLessonExams) {
            if (!passedQuizIds.contains(quiz.getId())) {
                missingRequirements.add("Bài thi lesson \"" + quiz.getTitle() + "\"");
            }
        }

        Map<String, EnrollmentJpaEntity.LessonProgressData> progressMap = enrollment.getProgress() != null
                ? enrollment.getProgress()
                : Collections.emptyMap();

        for (LessonJpaEntity lesson : lessons) {
            Set<String> completedSections = completedSectionsForLesson(progressMap, lesson.getId());
            for (SectionRequirement sectionRequirement : extractCertificateSectionExams(lesson)) {
                if (!completedSections.contains(sectionRequirement.marker())) {
                    missingRequirements.add("Mục thi \"" + sectionRequirement.title() + "\"");
                }
            }
        }

        if (missingRequirements.isEmpty()) {
            return EligibilityResult.allowed();
        }

        return EligibilityResult.denied(
                "Bạn cần vượt qua tất cả bài thi chứng chỉ bắt buộc trước khi được cấp chứng chỉ. Còn thiếu: "
                        + String.join(", ", missingRequirements)
        );
    }

    private Set<UUID> loadPassedLessonQuizIds(UUID studentId, List<QuizJpaEntity> requiredQuizzes) {
        if (requiredQuizzes.isEmpty()) {
            return Set.of();
        }

        Map<UUID, QuizJpaEntity> quizById = requiredQuizzes.stream()
                .collect(Collectors.toMap(QuizJpaEntity::getId, quiz -> quiz));

        return quizAttemptJpaRepository.findByQuizIdInAndStudentId(new ArrayList<>(quizById.keySet()), studentId).stream()
                .filter(attempt -> isPassingAttempt(attempt, quizById.get(attempt.getQuizId())))
                .map(QuizAttemptJpaEntity::getQuizId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private boolean isPassingAttempt(QuizAttemptJpaEntity attempt, QuizJpaEntity quiz) {
        if (attempt == null || quiz == null) {
            return false;
        }

        if (Boolean.TRUE.equals(attempt.getIsPassed())) {
            return true;
        }

        if (attempt.getScore() == null) {
            return false;
        }

        return attempt.getScore() >= quiz.getPassingScore();
    }

    private Set<String> completedSectionsForLesson(
            Map<String, EnrollmentJpaEntity.LessonProgressData> progressMap,
            UUID lessonId
    ) {
        EnrollmentJpaEntity.LessonProgressData lessonProgress = progressMap.get(lessonId.toString());
        if (lessonProgress == null || lessonProgress.getCompletedSections() == null) {
            return Set.of();
        }

        return new LinkedHashSet<>(lessonProgress.getCompletedSections());
    }

    private List<SectionRequirement> extractCertificateSectionExams(LessonJpaEntity lesson) {
        if (lesson.getContentBlocks() == null || lesson.getContentBlocks().isEmpty()) {
            return List.of();
        }

        List<SectionRequirement> requirements = new ArrayList<>();
        for (ContentBlock block : lesson.getContentBlocks()) {
            if (block == null || !"QUIZ".equalsIgnoreCase(block.getType())) {
                continue;
            }

            Map<String, Object> quizData = asMap(block.getData().get("quizData"));
            if (normalizeQuizType(quizData.get("quizType")) != QuizJpaEntity.AssessmentType.EXAM) {
                continue;
            }

            if (!Boolean.TRUE.equals(quizData.get("countsTowardCertificate"))) {
                continue;
            }

            String title = Objects.toString(block.getData().get("title"), lesson.getTitle());
            requirements.add(new SectionRequirement("quiz:" + block.getId(), title));
        }

        return requirements;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> rawMap) {
            Map<String, Object> result = new LinkedHashMap<>();
            rawMap.forEach((key, mapValue) -> result.put(String.valueOf(key), mapValue));
            return result;
        }
        return Map.of();
    }

    private QuizJpaEntity.AssessmentType normalizeQuizType(Object value) {
        String normalized = Objects.toString(value, "ASSESSMENT").trim().toUpperCase();
        return switch (normalized) {
            case "PRACTICE" -> QuizJpaEntity.AssessmentType.PRACTICE;
            case "EXAM" -> QuizJpaEntity.AssessmentType.EXAM;
            default -> QuizJpaEntity.AssessmentType.ASSESSMENT;
        };
    }

    private record SectionRequirement(String marker, String title) {}
}
