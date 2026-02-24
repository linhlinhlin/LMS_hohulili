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
}
