package com.example.lms.repository;

import com.example.lms.entity.LessonAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LessonAssignmentRepository extends JpaRepository<LessonAssignment, UUID> {

    @Query("SELECT la FROM LessonAssignment la WHERE la.lesson.id = :lessonId")
    List<LessonAssignment> findByLessonId(@Param("lessonId") UUID lessonId);

    @Query("SELECT la FROM LessonAssignment la WHERE la.assignment.id = :assignmentId")
    List<LessonAssignment> findByAssignmentId(@Param("assignmentId") UUID assignmentId);

    @Query("SELECT la FROM LessonAssignment la WHERE la.lesson.id = :lessonId AND la.assignment.id = :assignmentId")
    Optional<LessonAssignment> findByLessonIdAndAssignmentId(@Param("lessonId") UUID lessonId, @Param("assignmentId") UUID assignmentId);

    @Modifying
    @Query("DELETE FROM LessonAssignment la WHERE la.lesson.id = :lessonId AND la.assignment.id = :assignmentId")
    long deleteByLessonIdAndAssignmentId(@Param("lessonId") UUID lessonId, @Param("assignmentId") UUID assignmentId);
}
