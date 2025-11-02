package com.example.lms.repository;

import com.example.lms.entity.LessonAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LessonAttachmentRepository extends JpaRepository<LessonAttachment, UUID> {

    List<LessonAttachment> findByLessonIdOrderByDisplayOrderAsc(UUID lessonId);

    List<LessonAttachment> findByLessonIdAndFileTypeOrderByDisplayOrderAsc(UUID lessonId, String fileType);

    @Query("SELECT MAX(a.displayOrder) FROM LessonAttachment a WHERE a.lesson.id = :lessonId")
    Integer findMaxDisplayOrderByLessonId(@Param("lessonId") UUID lessonId);

    @Modifying
    @Query("DELETE FROM LessonAttachment a WHERE a.lesson.id = :lessonId")
    void deleteByLessonId(@Param("lessonId") UUID lessonId);

    @Modifying
    @Query("UPDATE LessonAttachment a SET a.displayOrder = :displayOrder WHERE a.id = :attachmentId")
    void updateDisplayOrder(@Param("attachmentId") UUID attachmentId, @Param("displayOrder") Integer displayOrder);

    @Query("SELECT COUNT(a) FROM LessonAttachment a WHERE a.lesson.id = :lessonId")
    long countByLessonId(@Param("lessonId") UUID lessonId);

    // Find attachments by file types for bulk operations
    @Query("SELECT a FROM LessonAttachment a WHERE a.lesson.id = :lessonId AND a.fileType IN :fileTypes ORDER BY a.displayOrder ASC")
    List<LessonAttachment> findByLessonIdAndFileTypes(@Param("lessonId") UUID lessonId, @Param("fileTypes") List<String> fileTypes);
}