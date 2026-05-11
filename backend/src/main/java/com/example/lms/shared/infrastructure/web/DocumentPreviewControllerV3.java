package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.service.DocumentPreviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Document Previews V3", description = "On-demand PDF previews for Office documents")
@RestController
@RequestMapping("/api/v3/document-previews")
@RequiredArgsConstructor
public class DocumentPreviewControllerV3 {

    private final DocumentPreviewService documentPreviewService;

    @Operation(summary = "Create or fetch a cached PDF preview for a document URL")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> requestPreview(
            @RequestBody DocumentPreviewRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        try {
            var result = documentPreviewService.requestPreview(request.fileUrl(), user.getId());
            return ResponseEntity.ok(ApiResponse.success(result.toMap(), "Document preview status"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error(ex.getMessage()));
        }
    }

    public record DocumentPreviewRequest(String fileUrl) {}
}
