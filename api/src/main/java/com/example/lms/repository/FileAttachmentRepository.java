package com.example.lms.repository;

import com.example.lms.entity.FileAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FileAttachmentRepository extends JpaRepository<FileAttachment, UUID> {
    
    // Tìm tất cả file của một Section
    List<FileAttachment> findByEntityIdAndEntityTypeAndStatus(
        UUID entityId, 
        String entityType, 
        String status
    );
}
