package com.example.lms.service.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public interface FileStorageProvider {
    /**
     * Resolve a file retrieval request.
     * Can return a Resource (for local stream) or a String URL (for redirect).
     */
    Object resolveFile(String storageKey) throws IOException;

    /**
     * Upload a file and return its storage key.
     */
    String uploadFile(MultipartFile file, String path) throws IOException;
    
    /**
     * Delete a file.
     */
    void deleteFile(String storageKey);
    
    /**
     * Get provider type (LOCAL, R2, S3)
     */
    String getProviderName();
}
