package com.example.lms.course_authoring.infrastructure.service;

import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CoursePublicationJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseCategoryJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CoursePublicationJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.service.VideoAssetPresentationService;
import com.example.lms.shared.infrastructure.service.PublicAssetUrlService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CoursePublicationServiceTest {

    @Mock private CourseRepository courseRepository;
    @Mock private ChapterJpaRepository chapterRepository;
    @Mock private LessonJpaRepository lessonRepository;
    @Mock private UserJpaRepository userJpaRepository;
    @Mock private CourseCategoryJpaRepository courseCategoryJpaRepository;
    @Mock private JpaEnrollmentRepository enrollmentJpaRepository;
    @Mock private QuizJpaRepositoryV3 quizJpaRepository;
    @Mock private AssignmentJpaRepository assignmentJpaRepository;
    @Mock private QuestionJpaRepository questionJpaRepository;
    @Mock private CoursePublicationJpaRepository publicationRepository;
    @Mock private VideoAssetPresentationService videoAssetPresentationService;
    @Mock private PublicAssetUrlService publicAssetUrlService;

    @InjectMocks
    private CoursePublicationService service;

    @Test
    @DisplayName("published content does not crash when legacy snapshot sections have no videoAssetId")
    void getPublishedContentHandlesLegacySectionsWithoutVideoAssetId() {
        UUID courseId = UUID.randomUUID();

        Map<String, Object> section = new LinkedHashMap<>();
        section.put("id", "legacy-section-1");
        section.put("type", "TEXT");
        section.put("title", "Legacy text block");
        section.put("content", "<p>No video asset here</p>");

        Map<String, Object> lesson = new LinkedHashMap<>();
        lesson.put("id", UUID.randomUUID().toString());
        lesson.put("title", "Legacy lesson");
        lesson.put("sections", List.of(section));

        Map<String, Object> chapter = new LinkedHashMap<>();
        chapter.put("id", UUID.randomUUID().toString());
        chapter.put("title", "Legacy chapter");
        chapter.put("lessons", List.of(lesson));

        CoursePublicationJpaEntity publication = CoursePublicationJpaEntity.builder()
                .id(UUID.randomUUID())
                .courseId(courseId)
                .publicationNumber(1)
                .contentVersion(1)
                .publishedAt(Instant.now())
                .snapshot(Map.of("content", List.of(chapter)))
                .build();

        when(publicationRepository.findTopByCourseIdOrderByPublicationNumberDesc(courseId))
                .thenReturn(Optional.of(publication));

        List<Map<String, Object>> content = service.getPublishedContent(courseId, null);

        assertThat(content).hasSize(1);
        assertThat(content.getFirst()).containsEntry("title", "Legacy chapter");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lessons = (List<Map<String, Object>>) content.getFirst().get("lessons");
        assertThat(lessons).hasSize(1);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> sections = (List<Map<String, Object>>) lessons.getFirst().get("sections");
        assertThat(sections).hasSize(1);
        assertThat(sections.getFirst()).containsEntry("title", "Legacy text block");
    }
}
