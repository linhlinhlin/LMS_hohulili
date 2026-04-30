package com.example.lms.shared.application.port;

import com.example.lms.shared.domain.model.ContentBlock;

import java.util.List;
import java.util.UUID;

/**
 * Application port for file management operations.
 * Use cases depend on this port, infrastructure provides the adapter.
 */
public interface FileManagementPort {

    /**
     * Scans content blocks for file URLs and links them to the entity.
     */
    void linkFilesToEntity(List<ContentBlock> blocks, UUID entityId, String entityType);

    /**
     * Links a single file (looked up by its public URL) to an entity.
     * Required for entities that store a single URL column instead of EditorJS content
     * (course thumbnails, course intro videos, user avatars, assignment submissions, etc.).
     * Without this link, {@code file_attachments.entity_id} stays NULL and
     * {@code UploadCleanupScheduler} treats the file as orphan and deletes it after 7 days.
     */
    void linkFileByUrl(String url, UUID entityId, String entityType);
}
