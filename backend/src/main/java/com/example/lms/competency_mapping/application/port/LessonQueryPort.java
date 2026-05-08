package com.example.lms.competency_mapping.application.port;

import java.util.List;
import java.util.UUID;

public interface LessonQueryPort {

    record LessonInfo(UUID id, String title, String chapterTitle, UUID chapterId, UUID courseId) {}

    LessonInfo findById(UUID lessonId);
    List<LessonInfo> findAllByCourseId(UUID courseId);
    boolean canTeachCourse(UUID courseId, UUID teacherId);
    boolean canTeachLesson(UUID lessonId, UUID teacherId);
    boolean isStudentEnrolledInCourse(UUID courseId, UUID studentId);
    boolean isStudentEnrolledInLesson(UUID lessonId, UUID studentId);
}
