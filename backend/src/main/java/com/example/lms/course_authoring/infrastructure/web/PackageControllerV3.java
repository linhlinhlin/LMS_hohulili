package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * V3 Controller for Course Packages (legacy compatibility layer).
 * New code should use QuestionBankControllerV3 instead.
 */
@Tag(name = "Packages V3", description = "Question Bank Package management endpoints")
@RestController
@RequestMapping("/api/v3/packages")
@RequiredArgsConstructor
public class PackageControllerV3 {

    private final com.example.lms.shared.infrastructure.persistence.repository.PackageJpaRepository packageRepository;
    private final com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository questionRepository;
    private final com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository userRepository;

    @Operation(summary = "Get teacher's packages (Question Banks)")
    @GetMapping("/my-packages")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<PackageDTO>>> getMyPackages(@org.springframework.security.core.annotation.AuthenticationPrincipal com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        List<com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity> entities = packageRepository.findByOwnerId(user.getId());
        
        List<PackageDTO> dtos = entities.stream().map(this::toDTO).toList();
        return ResponseEntity.ok(ApiResponse.success(dtos, "Packages loaded"));
    }

    @Operation(summary = "Get all available packages")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<PackageDTO>>> getAllPackages() {
        List<com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity> entities = packageRepository.findAll();
        List<PackageDTO> dtos = entities.stream().map(this::toDTO).toList();
        return ResponseEntity.ok(ApiResponse.success(dtos, "All packages loaded"));
    }

    @Operation(summary = "Get package by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PackageDTO>> getPackageById(@PathVariable java.util.UUID id) {
        return packageRepository.findById(id)
                .map(pkg -> ResponseEntity.ok(ApiResponse.success(toDTO(pkg))))
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Create package")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<PackageDTO>> createPackage(
            @Valid @RequestBody CreatePackageRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        
        var entity = com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity.builder()
                .name(request.getName())
                .description(request.getDescription())
                .subject(request.getSubject())
                .visibility(request.getVisibility() != null ? 
                    com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity.Visibility.valueOf(request.getVisibility()) : 
                    com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity.Visibility.PRIVATE)
                .ownerId(user.getId())
                .capacity(request.getCapacity())
                .isActive(true)
                .build();
        
        entity = packageRepository.save(entity);
        return ResponseEntity.ok(ApiResponse.success(toDTO(entity), "Package created"));
    }

    @Operation(summary = "Update package")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<PackageDTO>> updatePackage(
            @PathVariable java.util.UUID id,
            @Valid @RequestBody UpdatePackageRequest request) {
        
        return packageRepository.findById(id)
                .map(entity -> {
                    if (request.getName() != null) entity.setName(request.getName());
                    if (request.getDescription() != null) entity.setDescription(request.getDescription());
                    if (request.getSubject() != null) entity.setSubject(request.getSubject());
                    if (request.getVisibility() != null) {
                         entity.setVisibility(com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity.Visibility.valueOf(request.getVisibility()));
                    }
                    if (request.getCapacity() != null) entity.setCapacity(request.getCapacity());
                    
                    return ResponseEntity.ok(ApiResponse.success(toDTO(packageRepository.save(entity)), "Package updated"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Delete package")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<String>> deletePackage(@PathVariable java.util.UUID id) {
        if (packageRepository.existsById(id)) {
            packageRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.success("Deleted", "Package deleted"));
        }
        return ResponseEntity.notFound().build();
    }

    @Operation(summary = "Get questions in package")
    @GetMapping("/{id}/questions")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getQuestionsInPackage(@PathVariable java.util.UUID id) {
        var questions = questionRepository.findByPackageId(id);
        List<Map<String, Object>> result = questions.stream().map(q -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", q.getId().toString());
            // Extract text content from contentBlocks for display
            String contentText = extractTextFromBlocks(q.getContentBlocks());
            map.put("content", contentText);
            map.put("type", "MULTIPLE_CHOICE");
            map.put("difficulty", q.getDifficulty() != null ? q.getDifficulty().name() : "MEDIUM");
            map.put("tags", q.getTags());
            map.put("correctOption", q.getCorrectOption());
            map.put("createdAt", q.getCreatedAt() != null ? q.getCreatedAt().toString() : null);
            map.put("status", q.getStatus() != null ? q.getStatus().name() : "ACTIVE");
            return map;
        }).toList();
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private String extractTextFromBlocks(java.util.List<com.example.lms.shared.domain.model.ContentBlock> blocks) {
        if (blocks == null || blocks.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (var block : blocks) {
            if (block.getData() != null) {
                Object text = block.getData().get("text");
                if (text != null) {
                    if (sb.length() > 0) sb.append(" ");
                    sb.append(text.toString());
                }
            }
        }
        return sb.toString();
    }

    @Operation(summary = "Move questions to package")
    @PostMapping("/move-questions")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<String>> moveQuestions(@Valid @RequestBody MoveQuestionsRequest request) {
        if (request.getQuestionIds() == null || request.getQuestionIds().isEmpty()) {
             return ResponseEntity.badRequest().body(ApiResponse.error("400", "No questions specified"));
        }
        java.util.UUID targetId = java.util.UUID.fromString(request.getTargetPackageId());
        
        List<com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity> questions = 
            questionRepository.findAllById(request.getQuestionIds().stream().map(java.util.UUID::fromString).toList());
            
        questions.forEach(q -> q.setPackageId(targetId));
        questionRepository.saveAll(questions);
        
        return ResponseEntity.ok(ApiResponse.success("Moved", "Questions moved successfully"));
    }
    
    @Operation(summary = "Search packages")
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<PackageDTO>>> searchPackages(@RequestParam(required = false) String keyword) {
        if (keyword == null || keyword.isBlank()) {
             return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
        // Using unpaged for simplicity or default page
        org.springframework.data.domain.Page<com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity> page = 
            packageRepository.findByNameContainingIgnoreCase(keyword, org.springframework.data.domain.Pageable.ofSize(20));
            
        List<PackageDTO> dtos = page.getContent().stream().map(this::toDTO).toList();
        return ResponseEntity.ok(ApiResponse.success(dtos, "Search results"));
    }

    // === Helpers ===

    private PackageDTO toDTO(com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity entity) {
        String ownerName = userRepository.findById(entity.getOwnerId())
                .map(u -> u.getFullName())
                .orElse("Unknown");
        int questionCount = (int) questionRepository.countByPackageId(entity.getId());

        return PackageDTO.builder()
                .id(entity.getId().toString())
                .name(entity.getName())
                .description(entity.getDescription())
                .subject(entity.getSubject())
                .ownerId(entity.getOwnerId().toString())
                .ownerName(ownerName)
                .visibility(entity.getVisibility().name())
                .capacity(entity.getCapacity())
                .questionCount(questionCount)
                .status(entity.getStatus() != null ? entity.getStatus() : "ACTIVE")
                .createdAt(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)
                .updatedAt(entity.getUpdatedAt() != null ? entity.getUpdatedAt().toString() : null)
                .build();
    }

    // === DTOs ===

    @lombok.Builder
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class PackageDTO {
        private String id;
        private String name;
        private String description;
        private String subject;
        private String ownerId;
        private String ownerName;
        private String visibility;
        private Integer capacity;
        private Integer questionCount;
        private String status;
        private String createdAt;
        private String updatedAt;
    }

    @lombok.Data
    public static class CreatePackageRequest {
        @NotBlank(message = "Name is required")
        private String name;
        private String description;
        private String subject;
        private String visibility;
        private Integer capacity;
    }

    @lombok.Data
    public static class UpdatePackageRequest {
        private String name;
        private String description;
        private String subject;
        private String visibility;
        private Integer capacity;
    }

    @lombok.Data
    public static class MoveQuestionsRequest {
        @NotEmpty(message = "Question IDs cannot be empty")
        private List<String> questionIds;
        private String targetPackageId;
    }
}
