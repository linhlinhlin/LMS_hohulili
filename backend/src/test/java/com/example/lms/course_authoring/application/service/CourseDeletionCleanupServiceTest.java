package com.example.lms.course_authoring.application.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CourseDeletionCleanupService Tests")
class CourseDeletionCleanupServiceTest {

    @Mock
    private EntityManager entityManager;

    @Mock
    private Query tableQuery;

    @Mock
    private Query deleteQuery;

    private CourseDeletionCleanupService service;

    @BeforeEach
    void setUp() {
        service = new CourseDeletionCleanupService();
        ReflectionTestUtils.setField(service, "entityManager", entityManager);

        when(entityManager.createNativeQuery(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0, String.class);
            if (sql.startsWith("SELECT table_name FROM information_schema.tables")) {
                return tableQuery;
            }
            return deleteQuery;
        });
        when(deleteQuery.setParameter(anyString(), any())).thenReturn(deleteQuery);
    }

    @Test
    @DisplayName("Should cleanup non-cascading course dependents before hard delete")
    void shouldCleanupNonCascadingCourseDependents() {
        when(tableQuery.getResultList()).thenReturn(List.of(
                "certificates",
                "student_notes",
                "ai_alerts",
                "quiz_assignments",
                "learning_events",
                "video_progress",
                "student_lesson_progress",
                "assignments",
                "revenue_splits"
        ));

        service.cleanupBeforeDelete(UUID.randomUUID());

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager, atLeastOnce()).createNativeQuery(sqlCaptor.capture());

        assertThat(sqlCaptor.getAllValues())
                .contains("DELETE FROM certificates WHERE course_id = :courseId")
                .contains("DELETE FROM student_notes WHERE course_id = :courseId")
                .contains("DELETE FROM ai_alerts WHERE course_id = :courseId")
                .contains("DELETE FROM quiz_assignments WHERE course_id = :courseId")
                .contains("DELETE FROM revenue_splits WHERE course_id = :courseId");

        assertThat(sqlCaptor.getAllValues())
                .anySatisfy(sql -> assertThat(sql)
                        .startsWith("DELETE FROM learning_events WHERE lesson_id IN")
                        .contains("JOIN chapters ch ON ch.id = l.chapter_id")
                        .contains("WHERE ch.course_id = :courseId"))
                .anySatisfy(sql -> assertThat(sql)
                        .startsWith("DELETE FROM assignments WHERE course_id = :courseId OR lesson_id IN")
                        .contains("WHERE ch.course_id = :courseId"));

        verify(entityManager).flush();
    }

    @Test
    @DisplayName("Should skip cleanup for tables missing in current schema")
    void shouldSkipCleanupForMissingTables() {
        when(tableQuery.getResultList()).thenReturn(List.of("student_notes"));

        service.cleanupBeforeDelete(UUID.randomUUID());

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager, atLeastOnce()).createNativeQuery(sqlCaptor.capture());

        assertThat(sqlCaptor.getAllValues())
                .contains("DELETE FROM student_notes WHERE course_id = :courseId")
                .doesNotContain("DELETE FROM ai_alerts WHERE course_id = :courseId")
                .doesNotContain("DELETE FROM revenue_splits WHERE course_id = :courseId");
    }
}
