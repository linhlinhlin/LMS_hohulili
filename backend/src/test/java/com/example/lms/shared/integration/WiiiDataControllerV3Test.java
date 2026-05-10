package com.example.lms.shared.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WiiiDataControllerV3Test {

    @Mock private JdbcTemplate jdbc;

    private WiiiDataControllerV3 controller;

    @BeforeEach
    void setUp() {
        controller = new WiiiDataControllerV3(jdbc);
    }

    @Test
    void getCourseStatsCalculatesQuizAverageThroughLessonChapterCoursePath() {
        UUID courseId = UUID.randomUUID();

        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(courseId)))
                .thenReturn(12, 8, 3);
        when(jdbc.queryForObject(
                argThat(sql -> sql != null
                        && sql.contains("AVG(qa.score)")
                        && sql.contains("JOIN lessons l ON q.lesson_id = l.id")),
                eq(Double.class),
                eq(courseId)
        )).thenReturn(84.44);
        when(jdbc.queryForObject(
                argThat(sql -> sql != null && sql.contains("AVG(e.completion_percent)")),
                eq(Double.class),
                eq(courseId)
        )).thenReturn(62.22);

        var response = controller.getCourseStats(courseId);

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData())
                .containsEntry("students_count", 12)
                .containsEntry("avg_grade", 84.4)
                .containsEntry("completion_rate", 62.2)
                .containsEntry("active_last_7d", 8)
                .containsEntry("at_risk_count", 3);

        verify(jdbc).queryForObject(
                argThat(sql -> sql != null
                        && sql.contains("JOIN lessons l ON q.lesson_id = l.id")
                        && sql.contains("JOIN chapters ch ON l.chapter_id = ch.id")
                        && sql.contains("WHERE ch.course_id = ?")),
                eq(Double.class),
                eq(courseId)
        );
    }
}
