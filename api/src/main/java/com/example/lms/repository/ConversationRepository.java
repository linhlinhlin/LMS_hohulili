package com.example.lms.repository;

import com.example.lms.entity.Conversation;
import com.example.lms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    /**
     * Find conversation between teacher and student
     */
    Optional<Conversation> findByTeacherAndStudent(User teacher, User student);

    /**
     * Find conversation between two users (regardless of role)
     */
    @Query("SELECT c FROM Conversation c WHERE " +
           "(c.teacher.id = :userId1 AND c.student.id = :userId2) OR " +
           "(c.teacher.id = :userId2 AND c.student.id = :userId1)")
    Optional<Conversation> findByParticipants(@Param("userId1") UUID userId1, @Param("userId2") UUID userId2);

    /**
     * Find all conversations for a teacher (not archived)
     */
    @Query("SELECT c FROM Conversation c " +
           "LEFT JOIN FETCH c.teacher " +
           "LEFT JOIN FETCH c.student " +
           "WHERE c.teacher.id = :teacherId AND c.isArchivedByTeacher = false " +
           "ORDER BY c.updatedAt DESC")
    List<Conversation> findByTeacherIdNotArchived(@Param("teacherId") UUID teacherId);

    /**
     * Find all conversations for a student (not archived)
     */
    @Query("SELECT c FROM Conversation c " +
           "LEFT JOIN FETCH c.teacher " +
           "LEFT JOIN FETCH c.student " +
           "WHERE c.student.id = :studentId AND c.isArchivedByStudent = false " +
           "ORDER BY c.updatedAt DESC")
    List<Conversation> findByStudentIdNotArchived(@Param("studentId") UUID studentId);

    /**
     * Find all conversations for a user (teacher or student)
     */
    @Query("SELECT c FROM Conversation c " +
           "LEFT JOIN FETCH c.teacher " +
           "LEFT JOIN FETCH c.student " +
           "WHERE (c.teacher.id = :userId AND (:includeArchived = true OR c.isArchivedByTeacher = false)) " +
           "   OR (c.student.id = :userId AND (:includeArchived = true OR c.isArchivedByStudent = false)) " +
           "ORDER BY c.updatedAt DESC")
    List<Conversation> findByUserId(@Param("userId") UUID userId, @Param("includeArchived") boolean includeArchived);

    /**
     * Count unread messages for a user across all conversations
     */
    @Query("SELECT COUNT(m) FROM Message m " +
           "JOIN m.conversation c " +
           "WHERE m.sender.id != :userId " +
           "AND m.isRead = false " +
           "AND ((c.teacher.id = :userId AND c.isArchivedByTeacher = false) " +
           "  OR (c.student.id = :userId AND c.isArchivedByStudent = false))")
    long countUnreadMessages(@Param("userId") UUID userId);
}
