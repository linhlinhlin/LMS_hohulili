package com.example.lms.course_authoring.application.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LessonCleanupService Tests")
class LessonCleanupServiceTest {

    @Mock
    private EntityManager entityManager;

    @Mock
    private Query tableQuery;

    @Mock
    private Query deleteQuery;

    private LessonCleanupService service;

    @BeforeEach
    void setUp() {
        service = new LessonCleanupService();
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
    @DisplayName("Should use live schema table names and delete assignment and quiz roots")
    void shouldUseLiveSchemaTableNamesAndDeleteAssessmentRoots() {
        when(tableQuery.getResultList()).thenReturn(List.of(
                "assignments",
                "quizzes",
                "lesson_assignments",
                "lesson_attachments",
                "student_lesson_progress",
                "student_notes",
                "learning_events",
                "video_progress"
        ));

        service.cleanupBeforeDelete(UUID.randomUUID());

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager, atLeastOnce()).createNativeQuery(sqlCaptor.capture());

        assertThat(sqlCaptor.getAllValues())
                .contains("DELETE FROM assignments WHERE lesson_id = :lessonId")
                .contains("DELETE FROM quizzes WHERE lesson_id = :lessonId")
                .contains("DELETE FROM student_lesson_progress WHERE lesson_id = :lessonId")
                .contains("DELETE FROM student_notes WHERE lesson_id = :lessonId")
                .contains("DELETE FROM learning_events WHERE lesson_id = :lessonId")
                .contains("DELETE FROM video_progress WHERE lesson_id = :lessonId")
                .doesNotContain("DELETE FROM quiz_attempt_items WHERE attempt_id IN " +
                        "(SELECT id FROM quiz_attempts WHERE quiz_id IN " +
                        "(SELECT id FROM quizzes WHERE lesson_id = :lessonId))")
                .doesNotContain("DELETE FROM stu_lesson_progress WHERE lesson_id = :lessonId");

        verify(entityManager).flush();
    }

    @Test
    @DisplayName("Should skip deletes for tables missing in current schema")
    void shouldSkipDeletesForTablesMissingInCurrentSchema() {
        when(tableQuery.getResultList()).thenReturn(List.of("assignments", "student_notes"));

        service.cleanupBeforeDelete(UUID.randomUUID());

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager, atLeastOnce()).createNativeQuery(sqlCaptor.capture());

        assertThat(sqlCaptor.getAllValues())
                .contains("DELETE FROM assignments WHERE lesson_id = :lessonId")
                .contains("DELETE FROM student_notes WHERE lesson_id = :lessonId")
                .doesNotContain("DELETE FROM quizzes WHERE lesson_id = :lessonId")
                .doesNotContain("DELETE FROM lesson_attachments WHERE lesson_id = :lessonId")
                .doesNotContain("DELETE FROM student_lesson_progress WHERE lesson_id = :lessonId");
    }
}
