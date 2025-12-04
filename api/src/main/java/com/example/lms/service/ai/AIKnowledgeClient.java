package com.example.lms.service.ai;

import com.example.lms.config.AIServiceConfig;
import com.example.lms.dto.ai.external.*;
import com.example.lms.service.ai.exception.AIServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;

/**
 * HTTP Client cho AI Knowledge Management APIs
 * Handles: Upload, Delete, Stats, List documents
 */
@Component
public class AIKnowledgeClient {
    
    private static final Logger log = LoggerFactory.getLogger(AIKnowledgeClient.class);
    
    private final RestTemplate restTemplate;
    private final AIServiceConfig config;
    
    public AIKnowledgeClient(AIServiceConfig config, RestTemplateBuilder builder) {
        this.config = config;
        this.restTemplate = builder
            .connectTimeout(Duration.ofSeconds(30))
            .readTimeout(Duration.ofSeconds(120)) // Longer timeout for file uploads
            .build();
    }
    
    /**
     * Upload document to AI Backend
     * POST /api/v1/knowledge/ingest (multipart/form-data)
     */
    public KnowledgeIngestResponse ingestKnowledge(MultipartFile file, String category) {
        String url = config.getUrl() + "/api/v1/knowledge/ingest";
        
        log.info("Uploading document to AI Backend: {} (category: {})", 
            file.getOriginalFilename(), category);
        
        try {
            // Create multipart body
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            
            // Add file as ByteArrayResource
            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };
            body.add("file", fileResource);
            body.add("role", "admin");
            body.add("category", category);
            
            HttpHeaders headers = createMultipartHeaders();
            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
            
            ResponseEntity<KnowledgeIngestResponse> response = restTemplate.exchange(
                url, HttpMethod.POST, entity, KnowledgeIngestResponse.class
            );
            
            log.info("Upload response: status={}", response.getStatusCode());
            return response.getBody();
            
        } catch (HttpClientErrorException e) {
            log.error("AI Backend rejected upload: {} - {}", 
                e.getStatusCode(), e.getResponseBodyAsString());
            throw new AIServiceException("Upload bị từ chối: " + e.getMessage(), 
                e.getStatusCode().value());
        } catch (Exception e) {
            log.error("Error uploading document", e);
            throw new AIServiceException("Lỗi upload: " + e.getMessage(), 500);
        }
    }
    
    /**
     * Get job status
     * GET /api/v1/knowledge/jobs/{job_id}
     */
    public KnowledgeJobStatusResponse getJobStatus(String jobId) {
        String url = config.getUrl() + "/api/v1/knowledge/jobs/" + jobId;
        
        try {
            HttpEntity<Void> entity = new HttpEntity<>(createJsonHeaders());
            ResponseEntity<KnowledgeJobStatusResponse> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, KnowledgeJobStatusResponse.class
            );
            return response.getBody();
        } catch (HttpClientErrorException.NotFound e) {
            throw new AIServiceException("Job không tồn tại: " + jobId, 404);
        } catch (Exception e) {
            log.error("Error getting job status", e);
            throw new AIServiceException("Lỗi lấy trạng thái job: " + e.getMessage(), 500);
        }
    }
    
    /**
     * List documents in Knowledge Base
     * GET /api/v1/knowledge/list
     */
    public KnowledgeListResponse listDocuments(int page, int limit) {
        String url = config.getUrl() + "/api/v1/knowledge/list?page=" + page + "&limit=" + limit;
        
        try {
            HttpEntity<Void> entity = new HttpEntity<>(createJsonHeaders());
            ResponseEntity<KnowledgeListResponse> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, KnowledgeListResponse.class
            );
            return response.getBody();
        } catch (Exception e) {
            log.error("Error listing documents", e);
            throw new AIServiceException("Lỗi lấy danh sách documents: " + e.getMessage(), 500);
        }
    }
    
    /**
     * Get Knowledge Base stats
     * GET /api/v1/knowledge/stats
     */
    public KnowledgeStatsResponse getStats() {
        String url = config.getUrl() + "/api/v1/knowledge/stats";
        
        try {
            HttpEntity<Void> entity = new HttpEntity<>(createJsonHeaders());
            ResponseEntity<KnowledgeStatsResponse> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, KnowledgeStatsResponse.class
            );
            return response.getBody();
        } catch (Exception e) {
            log.error("Error getting stats", e);
            throw new AIServiceException("Lỗi lấy thống kê: " + e.getMessage(), 500);
        }
    }
    
    /**
     * Delete document from Knowledge Base
     * DELETE /api/v1/knowledge/{document_id}
     */
    public DeleteKnowledgeResponse deleteDocument(String documentId) {
        String url = config.getUrl() + "/api/v1/knowledge/" + documentId;
        
        log.info("Deleting document from AI Backend: {}", documentId);
        
        try {
            // Create form data with role=admin
            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("role", "admin");
            
            HttpHeaders headers = createMultipartHeaders();
            HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(body, headers);
            
            ResponseEntity<DeleteKnowledgeResponse> response = restTemplate.exchange(
                url, HttpMethod.DELETE, entity, DeleteKnowledgeResponse.class
            );
            
            return response.getBody();
        } catch (HttpClientErrorException.NotFound e) {
            return new DeleteKnowledgeResponse("not_found", documentId, 0, "Document không tồn tại");
        } catch (Exception e) {
            log.error("Error deleting document", e);
            throw new AIServiceException("Lỗi xóa document: " + e.getMessage(), 500);
        }
    }
    
    /**
     * Delete user chat history
     * DELETE /api/v1/history/{user_id}
     */
    public DeleteHistoryResponse deleteHistory(String userId, String role, String requestingUserId) {
        String url = config.getUrl() + "/api/v1/history/" + userId;
        
        log.info("Deleting history for user {} (requested by {})", userId, requestingUserId);
        
        try {
            DeleteHistoryRequest request = new DeleteHistoryRequest(role, requestingUserId);
            HttpEntity<DeleteHistoryRequest> entity = new HttpEntity<>(request, createJsonHeaders());
            
            ResponseEntity<DeleteHistoryResponse> response = restTemplate.exchange(
                url, HttpMethod.DELETE, entity, DeleteHistoryResponse.class
            );
            
            return response.getBody();
        } catch (HttpClientErrorException.NotFound e) {
            return new DeleteHistoryResponse("not_found", userId, 0, "User không có lịch sử chat");
        } catch (HttpClientErrorException.Forbidden e) {
            throw new AIServiceException("Không có quyền xóa lịch sử của user này", 403);
        } catch (Exception e) {
            log.error("Error deleting history", e);
            throw new AIServiceException("Lỗi xóa lịch sử: " + e.getMessage(), 500);
        }
    }
    
    // ========== PRIVATE METHODS ==========
    
    private HttpHeaders createJsonHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-API-Key", config.getApiKey());
        return headers;
    }
    
    private HttpHeaders createMultipartHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.set("X-API-Key", config.getApiKey());
        return headers;
    }
}
