package com.example.lms.controller;

import com.example.lms.service.R2StorageService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;

import java.util.Map;

@RestController
@ConditionalOnProperty(prefix = "app.r2", name = "enabled", havingValue = "true")
@ConditionalOnBean(R2StorageService.class)
@RequestMapping("/api/v1/storage/r2")
@RequiredArgsConstructor
public class R2StorageController {

    private final R2StorageService r2StorageService;

    @PostMapping("/presign-upload")
    public ResponseEntity<Map<String, Object>> presignUpload(@RequestBody PresignRequest req) {
        String key = (req.objectKey == null || req.objectKey.isBlank())
                ? ("uploads/" + System.currentTimeMillis())
                : req.objectKey;
        Map<String, Object> payload = r2StorageService.generatePresignedUpload(key, req.contentType);
        return ResponseEntity.ok(payload);
    }

    @PostMapping("/presign-download")
    public ResponseEntity<Map<String, Object>> presignDownload(@RequestBody DownloadRequest req) {
        Map<String, Object> payload = r2StorageService.generatePresignedDownload(req.objectKey);
        return ResponseEntity.ok(payload);
    }

    @DeleteMapping("/object/{objectKey}")
    public ResponseEntity<Map<String, Object>> deleteObject(@PathVariable String objectKey) {
        boolean deleted = r2StorageService.deleteObject(objectKey);
        return ResponseEntity.ok(Map.of("deleted", deleted, "objectKey", objectKey));
    }

    @GetMapping("/public-url")
    public ResponseEntity<Map<String, Object>> publicUrl(@RequestParam String objectKey) {
        String url = r2StorageService.buildPublicUrl(objectKey);
        return ResponseEntity.ok(Map.of("publicUrl", url, "objectKey", objectKey));
    }

    @Data
    public static class PresignRequest {
        public String objectKey;
        public String contentType;
    }

    @Data
    public static class DownloadRequest {
        public String objectKey;
    }
}
