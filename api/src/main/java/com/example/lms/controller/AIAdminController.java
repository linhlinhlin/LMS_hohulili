package com.example.lms.controller;

import com.example.lms.dto.ai.*;
import com.example.lms.entity.User;
import com.example.lms.service.ai.AIKnowledgeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * REST Controller cho AI Admin operations
 * Quản lý Knowledge Base và User Data
 */
@RestController
@RequestMapping("/api/v1/ai/admin")
@Tag(name = "AI Admin", description = "AI Knowledge Management & User Data Operations")
public class AIAdminController {
    
    private static final Logger log = LoggerFactory.getLogger(AIAdminController.class);
    
    private final AIKnowledgeService knowledgeService;
    
    public AIAdminController(AIKnowledgeService knowledgeService) {
        this.knowledgeService = knowledgeService;
    }
    
    // ==================== KNOWLEDGE MANAGEMENT ====================
    
    /**
     * Upload document vào Knowledge Base
     * POST /api/v1/ai/admin/knowledge/upload
     */
    @PostMapping(value = "/knowledge/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Upload tài liệu vào Knowledge Base",
        description = "Admin upload file PDF để bổ sung kiến thức cho AI. " +
                     "File sẽ được xử lý và đưa vào Neo4j Knowledge Graph."
    )
    public ResponseEntity<KnowledgeUploadResponseDTO> uploadKnowledge(
            @Parameter(description = "File PDF (max 50MB)", required = true)
            @RequestParam("file") MultipartFile file,
            
            @Parameter(description = "Category: COLREGs, SOLAS, MARPOL, etc.", required = true)
            @RequestParam("category") String category,
            
            @AuthenticationPrincipal User admin
    ) {
        log.info("Admin {} uploading knowledge: {} (category: {})", 
            admin.getUsername(), file.getOriginalFilename(), category);
        
        KnowledgeUploadResponseDTO response = knowledgeService.uploadDocument(
            file, category, admin
        );
        
        if ("success".equals(response.status())) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * Kiểm tra trạng thái job xử lý document
     * GET /api/v1/ai/admin/knowledge/jobs/{jobId}
     */
    @GetMapping("/knowledge/jobs/{jobId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Kiểm tra trạng thái xử lý tài liệu",
        description = "Theo dõi tiến trình xử lý tài liệu đã upload. " +
                     "Job ID được trả về khi upload thành công."
    )
    public ResponseEntity<KnowledgeJobStatusDTO> getJobStatus(
            @Parameter(description = "Job ID từ response upload", required = true)
            @PathVariable String jobId,
            
            @AuthenticationPrincipal User admin
    ) {
        log.info("Admin {} checking job status: {}", admin.getUsername(), jobId);
        
        KnowledgeJobStatusDTO status = knowledgeService.getJobStatus(jobId, admin);
        return ResponseEntity.ok(status);
    }
    
    /**
     * Lấy danh sách documents trong Knowledge Base
     * GET /api/v1/ai/admin/knowledge/list
     */
    @GetMapping("/knowledge/list")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Danh sách tài liệu trong Knowledge Base",
        description = "Lấy danh sách tất cả documents đã upload vào Neo4j."
    )
    public ResponseEntity<List<KnowledgeDocumentDTO>> listDocuments(
            @Parameter(description = "Trang (bắt đầu từ 1)")
            @RequestParam(defaultValue = "1") int page,
            
            @Parameter(description = "Số lượng mỗi trang")
            @RequestParam(defaultValue = "20") int limit,
            
            @AuthenticationPrincipal User admin
    ) {
        log.info("Admin {} listing documents (page={}, limit={})", 
            admin.getUsername(), page, limit);
        
        List<KnowledgeDocumentDTO> documents = knowledgeService.listDocuments(admin, page, limit);
        return ResponseEntity.ok(documents);
    }
    
    /**
     * Lấy thống kê Knowledge Base
     * GET /api/v1/ai/admin/knowledge/stats
     */
    @GetMapping("/knowledge/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Thống kê Knowledge Base",
        description = "Lấy thống kê tổng quan về Neo4j Knowledge Graph: " +
                     "số documents, nodes, categories."
    )
    public ResponseEntity<KnowledgeStatsDTO> getStats(
            @AuthenticationPrincipal User admin
    ) {
        log.info("Admin {} getting knowledge stats", admin.getUsername());
        
        KnowledgeStatsDTO stats = knowledgeService.getStats(admin);
        return ResponseEntity.ok(stats);
    }
    
    /**
     * Xóa document khỏi Knowledge Base
     * DELETE /api/v1/ai/admin/knowledge/{documentId}
     */
    @DeleteMapping("/knowledge/{documentId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Xóa tài liệu khỏi Knowledge Base",
        description = "Xóa document và tất cả nodes liên quan trong Neo4j."
    )
    public ResponseEntity<DeleteKnowledgeResponseDTO> deleteDocument(
            @Parameter(description = "Document ID cần xóa", required = true)
            @PathVariable String documentId,
            
            @AuthenticationPrincipal User admin
    ) {
        log.info("Admin {} deleting document: {}", admin.getUsername(), documentId);
        
        DeleteKnowledgeResponseDTO response = knowledgeService.deleteDocument(documentId, admin);
        
        return switch (response.status()) {
            case "success" -> ResponseEntity.ok(response);
            case "not_found" -> ResponseEntity.notFound().build();
            default -> ResponseEntity.badRequest().body(response);
        };
    }
    
    // ==================== HISTORY MANAGEMENT ====================
    
    /**
     * Xóa lịch sử chat của user
     * DELETE /api/v1/ai/admin/history/{userId}
     */
    @DeleteMapping("/history/{userId}")
    @PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal.id.toString()")
    @Operation(
        summary = "Xóa lịch sử chat của user",
        description = "Admin có thể xóa lịch sử của bất kỳ user nào. " +
                     "User thường chỉ có thể xóa lịch sử của chính mình."
    )
    public ResponseEntity<DeleteHistoryResponseDTO> deleteUserHistory(
            @Parameter(description = "User ID cần xóa lịch sử", required = true)
            @PathVariable String userId,
            
            @AuthenticationPrincipal User requester
    ) {
        log.info("User {} requesting to delete history of user {}", 
            requester.getUsername(), userId);
        
        DeleteHistoryResponseDTO response = knowledgeService.deleteUserHistory(userId, requester);
        
        return switch (response.status()) {
            case "success" -> ResponseEntity.ok(response);
            case "not_found" -> ResponseEntity.notFound().build();
            default -> ResponseEntity.badRequest().body(response);
        };
    }
}
