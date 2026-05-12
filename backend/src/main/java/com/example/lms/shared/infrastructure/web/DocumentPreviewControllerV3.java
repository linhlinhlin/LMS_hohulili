package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.service.DocumentPreviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@Tag(name = "Document Previews V3", description = "On-demand PDF previews for Office documents")
@RestController
@RequestMapping("/api/v3/document-previews")
@RequiredArgsConstructor
public class DocumentPreviewControllerV3 {

    private final DocumentPreviewService documentPreviewService;

    @Operation(summary = "Create or fetch a cached PDF preview for a lesson document section")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> requestPreview(
            @RequestBody(required = false) DocumentPreviewRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        try {
            if (request == null) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Request body is required"));
            }
            var result = documentPreviewService.requestPreview(request.lessonId(), request.sectionId(), user);
            if (result.isRateLimited()) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .header("Retry-After", "60")
                        .body(ApiResponse.success(result.toMap(), "Document preview status"));
            }
            HttpStatus status = result.isProcessing() ? HttpStatus.ACCEPTED : HttpStatus.OK;
            return ResponseEntity.status(status).body(ApiResponse.success(result.toMap(), "Document preview status"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error(ex.getMessage()));
        }
    }

    public record DocumentPreviewRequest(UUID lessonId, String sectionId) {}
}
