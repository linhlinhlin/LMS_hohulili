package com.example.lms.shared.application.port;

import com.example.lms.shared.domain.model.ContentBlock;

import java.util.List;
import java.util.Optional;
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
     * Links a single file (looked up by its public URL) to an entity and returns the
     * matched {@code file_attachments.id}. The caller persists this id on the consumer
     * entity (e.g. {@code courses.thumbnail_attachment_id}) so the FK ON DELETE RESTRICT
     * constraint physically prevents the cleanup scheduler from deleting a referenced file.
     *
     * Returns {@link Optional#empty()} when:
     * <ul>
     *   <li>{@code url}/{@code entityId}/{@code entityType} is null/blank, or</li>
     *   <li>no {@code file_attachments} row matches the URL (external URL, e.g. YouTube).</li>
     * </ul>
     */
    Optional<UUID> linkFileByUrl(String url, UUID entityId, String entityType);
}
