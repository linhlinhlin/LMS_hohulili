package com.example.lms.service.ai;

import com.example.lms.dto.ai.*;
import com.example.lms.dto.ai.external.*;
import com.example.lms.entity.User;
import com.example.lms.entity.User.Role;
import com.example.lms.service.ai.exception.AIServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service quản lý AI Knowledge Base
 * Xử lý upload documents, xóa history, thống kê Neo4j
 */
@Service
public class AIKnowledgeService {
    
    private static final Logger log = LoggerFactory.getLogger(AIKnowledgeService.class);
    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    
    private final AIKnowledgeClient knowledgeClient;
    
    public AIKnowledgeService(AIKnowledgeClient knowledgeClient) {
        this.knowledgeClient = knowledgeClient;
    }
    
    /**
     * Upload document vào Knowledge Base
     * Chỉ Admin mới có quyền
     */
    public KnowledgeUploadResponseDTO uploadDocument(
            MultipartFile file, 
            String category, 
            User admin) {
        
        log.info("Admin {} uploading document: {} (category: {})", 
            admin.getUsername(), file.getOriginalFilename(), category);
        
        try {
            // Validate admin role
            validateAdminRole(admin);
            
            // Validate file
            validateDocumentFile(file);
            
            // Sanitize category
            String sanitizedCategory = sanitizeCategory(category);
            
            // Call AI Backend
            KnowledgeIngestResponse response = knowledgeClient.ingestKnowledge(
                file, sanitizedCategory
            );
            
            if (response.isAccepted()) {
                log.info("Document upload accepted. Job ID: {}", response.job_id());
                return KnowledgeUploadResponseDTO.success(
                    response.job_id(),
                    file.getOriginalFilename(),
                    sanitizedCategory,
                    file.getSize(),
                    admin.getUsername()
                );
            } else {
                log.error("AI Backend rejected document: {}", response.message());
                return KnowledgeUploadResponseDTO.error(
                    "AI Backend từ chối: " + response.message()
                );
            }
            
        } catch (AIServiceException e) {
            log.error("AI Service error uploading document", e);
            return KnowledgeUploadResponseDTO.error(e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error uploading document", e);
            return KnowledgeUploadResponseDTO.error(
                "Lỗi không xác định: " + e.getMessage()
            );
        }
    }
    
    /**
     * Lấy trạng thái job xử lý document
     */
    public KnowledgeJobStatusDTO getJobStatus(String jobId, User admin) {
        log.info("Admin {} checking job status: {}", admin.getUsername(), jobId);
        
        validateAdminRole(admin);
        
        KnowledgeJobStatusResponse response = knowledgeClient.getJobStatus(jobId);
        
        return new KnowledgeJobStatusDTO(
            response.job_id(),
            response.status(),
            response.progress(),
            response.nodes_created(),
            response.error_message(),
            response.filename(),
            response.category()
        );
    }
    
    /**
     * Lấy danh sách documents trong Knowledge Base
     */
    public List<KnowledgeDocumentDTO> listDocuments(User admin, int page, int limit) {
        log.info("Admin {} listing documents (page={}, limit={})", 
            admin.getUsername(), page, limit);
        
        validateAdminRole(admin);
        
        KnowledgeListResponse response = knowledgeClient.listDocuments(page, limit);
        
        return response.documents().stream()
            .map(doc -> new KnowledgeDocumentDTO(
                doc.id(),
                doc.filename(),
                doc.category(),
                doc.nodes_count(),
                doc.uploaded_by()
            ))
            .collect(Collectors.toList());
    }
    
    /**
     * Lấy thống kê Knowledge Base
     */
    public KnowledgeStatsDTO getStats(User admin) {
        log.info("Admin {} getting knowledge stats", admin.getUsername());
        
        validateAdminRole(admin);
        
        KnowledgeStatsResponse response = knowledgeClient.getStats();
        
        List<KnowledgeStatsDTO.RecentUploadDTO> recentUploads = 
            response.recent_uploads() != null 
                ? response.recent_uploads().stream()
                    .map(u -> new KnowledgeStatsDTO.RecentUploadDTO(
                        u.id(), u.filename(), u.category(), u.uploaded_at()
                    ))
                    .collect(Collectors.toList())
                : List.of();
        
        return new KnowledgeStatsDTO(
            response.total_documents(),
            response.total_nodes(),
            response.categories(),
            recentUploads
        );
    }
    
    /**
     * Xóa document khỏi Knowledge Base
     */
    public DeleteKnowledgeResponseDTO deleteDocument(String documentId, User admin) {
        log.info("Admin {} deleting document: {}", admin.getUsername(), documentId);
        
        try {
            validateAdminRole(admin);
            
            DeleteKnowledgeResponse response = knowledgeClient.deleteDocument(documentId);
            
            if (response.isDeleted()) {
                log.info("Document {} deleted, {} nodes removed", 
                    documentId, response.nodes_deleted());
                return DeleteKnowledgeResponseDTO.success(
                    documentId, response.nodes_deleted(), admin.getUsername()
                );
            } else if (response.isNotFound()) {
                return DeleteKnowledgeResponseDTO.notFound(documentId);
            } else {
                return DeleteKnowledgeResponseDTO.error(response.message());
            }
            
        } catch (Exception e) {
            log.error("Error deleting document", e);
            return DeleteKnowledgeResponseDTO.error(e.getMessage());
        }
    }
    
    /**
     * Xóa lịch sử chat của user
     * Admin có thể xóa của bất kỳ ai
     * User thường chỉ xóa được của mình
     */
    public DeleteHistoryResponseDTO deleteUserHistory(String targetUserId, User requester) {
        log.info("User {} requesting to delete history of user {}", 
            requester.getUsername(), targetUserId);
        
        try {
            // Validate permissions
            validateDeleteHistoryPermission(targetUserId, requester);
            
            // Map role
            String role = mapUserRole(requester);
            
            // Call AI Backend
            DeleteHistoryResponse response = knowledgeClient.deleteHistory(
                targetUserId, role, requester.getId().toString()
            );
            
            if (response.isDeleted()) {
                log.info("Deleted {} messages for user {}", 
                    response.getMessagesDeletedCount(), targetUserId);
                return DeleteHistoryResponseDTO.success(
                    targetUserId,
                    response.getMessagesDeletedCount(),
                    requester.getUsername()
                );
            } else if (response.isNotFound()) {
                return DeleteHistoryResponseDTO.notFound(targetUserId);
            } else {
                return DeleteHistoryResponseDTO.error(response.message());
            }
            
        } catch (AIServiceException e) {
            return DeleteHistoryResponseDTO.error(e.getMessage());
        } catch (Exception e) {
            log.error("Error deleting user history", e);
            return DeleteHistoryResponseDTO.error("Lỗi: " + e.getMessage());
        }
    }
    
    // ========== PRIVATE METHODS ==========
    
    private void validateAdminRole(User user) {
        if (user.getRole() != Role.ADMIN) {
            throw new AIServiceException("Chỉ Admin mới có quyền thực hiện", 403);
        }
    }
    
    private void validateDocumentFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new AIServiceException("File không được để trống", 400);
        }
        
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new AIServiceException("File quá lớn. Tối đa 50MB", 400);
        }
        
        String contentType = file.getContentType();
        if (!"application/pdf".equals(contentType)) {
            throw new AIServiceException("Chỉ hỗ trợ file PDF", 400);
        }
        
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".pdf")) {
            throw new AIServiceException("File phải có đuôi .pdf", 400);
        }
    }
    
    private void validateDeleteHistoryPermission(String targetUserId, User requester) {
        boolean isAdmin = requester.getRole() == Role.ADMIN;
        boolean isSelfDelete = requester.getId().toString().equals(targetUserId);
        
        if (!isAdmin && !isSelfDelete) {
            throw new AIServiceException(
                "Bạn chỉ có thể xóa lịch sử chat của chính mình", 403
            );
        }
    }
    
    private String sanitizeCategory(String category) {
        if (category == null || category.trim().isEmpty()) {
            return "General";
        }
        return category.trim().toUpperCase();
    }
    
    private String mapUserRole(User user) {
        if (user.getRole() == null) return "student";
        return switch (user.getRole()) {
            case ADMIN -> "admin";
            case TEACHER -> "teacher";
            case STUDENT -> "student";
        };
    }
}
