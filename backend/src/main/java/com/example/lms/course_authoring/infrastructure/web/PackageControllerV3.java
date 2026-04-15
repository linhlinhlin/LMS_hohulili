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
        List<PackageDTO> dtos = batchMapPackages(entities);
        return ResponseEntity.ok(ApiResponse.success(dtos, "Danh sách gói câu hỏi"));
    }

    @Operation(summary = "Get all available packages")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<PackageDTO>>> getAllPackages(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        List<com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity> entities;
        if (isAdminRole(user)) {
            entities = packageRepository.findAll();
        } else {
            entities = packageRepository.findAll().stream()
                    .filter(p -> p.getVisibility() == com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity.Visibility.PUBLIC
                            || p.getOwnerId().equals(user.getId()))
                    .toList();
        }
        List<PackageDTO> dtos = batchMapPackages(entities);
        return ResponseEntity.ok(ApiResponse.success(dtos, "Tất cả gói câu hỏi"));
    }

    @Operation(summary = "Get package by ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<PackageDTO>> getPackageById(
            @PathVariable java.util.UUID id,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        return packageRepository.findById(id)
                .map(pkg -> {
                    // P0: Non-admin can only see PUBLIC packages or their own
                    if (!isAdminRole(user) && !pkg.getOwnerId().equals(user.getId())
                            && pkg.getVisibility() != com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity.Visibility.PUBLIC) {
                        throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền xem gói câu hỏi này");
                    }
                    return ResponseEntity.ok(ApiResponse.success(toDTO(pkg)));
                })
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
        return ResponseEntity.ok(ApiResponse.success(toDTO(entity), "Tạo gói câu hỏi thành công"));
    }

    @Operation(summary = "Update package")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<PackageDTO>> updatePackage(
            @PathVariable java.util.UUID id,
            @Valid @RequestBody UpdatePackageRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {

        verifyPackageOwnership(id, user);
        return packageRepository.findById(id)
                .map(entity -> {
                    if (request.getName() != null) entity.setName(request.getName());
                    if (request.getDescription() != null) entity.setDescription(request.getDescription());
                    if (request.getSubject() != null) entity.setSubject(request.getSubject());
                    if (request.getVisibility() != null) {
                         entity.setVisibility(com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity.Visibility.valueOf(request.getVisibility()));
                    }
                    if (request.getCapacity() != null) entity.setCapacity(request.getCapacity());
                    
                    return ResponseEntity.ok(ApiResponse.success(toDTO(packageRepository.save(entity)), "Cập nhật gói câu hỏi thành công"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Delete package")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<String>> deletePackage(
            @PathVariable java.util.UUID id,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        verifyPackageOwnership(id, user);
        if (packageRepository.existsById(id)) {
            packageRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.success("Đã xóa", "Gói câu hỏi đã được xóa"));
        }
        return ResponseEntity.notFound().build();
    }

    @Operation(summary = "Get questions in package")
    @GetMapping("/{id}/questions")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getQuestionsInPackage(
            @PathVariable java.util.UUID id,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        // P0: Verify package ownership before exposing questions + correctOption
        verifyPackageOwnership(id, user);
        var questions = questionRepository.findByPackageId(id);
        List<Map<String, Object>> result = questions.stream().map(q -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", q.getId().toString());
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
            if (block.getData() == null) continue;
            var data = block.getData();
            // Text fields
            for (String key : java.util.List.of("html", "text", "content")) {
                Object val = data.get(key);
                if (val != null && !val.toString().isBlank()) {
                    if (sb.length() > 0) sb.append(" ");
                    sb.append(val);
                    break;
                }
            }
            // Non-text block fallback
            if (sb.isEmpty() || sb.toString().isBlank()) {
                String blockType = block.getType() != null ? block.getType().toLowerCase(java.util.Locale.ROOT) : "";
                String fallback = switch (blockType) {
                    case "image" -> "[Hình ảnh]";
                    case "video" -> "[Video]";
                    case "math", "formula", "katex" -> "[Công thức]";
                    case "table" -> "[Bảng]";
                    default -> null;
                };
                if (fallback != null) {
                    if (sb.length() > 0) sb.append(" ");
                    sb.append(fallback);
                }
            }
        }
        return sb.toString();
    }

    @Operation(summary = "Move questions to package")
    @PostMapping("/move-questions")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<String>> moveQuestions(
            @Valid @RequestBody MoveQuestionsRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        if (request.getQuestionIds() == null || request.getQuestionIds().isEmpty()) {
             return ResponseEntity.badRequest().body(ApiResponse.error("400", "Chưa chọn câu hỏi"));
        }
        java.util.UUID targetId;
        try {
            targetId = java.util.UUID.fromString(request.getTargetPackageId());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("400", "ID gói đích không hợp lệ"));
        }

        // Verify target package ownership
        verifyPackageOwnership(targetId, user);

        List<com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity> questions =
            questionRepository.findAllById(request.getQuestionIds().stream().map(java.util.UUID::fromString).toList());

        // Verify source package ownership (deduplicated)
        if (!isAdminRole(user)) {
            questions.stream()
                .map(q -> q.getPackageId())
                .filter(pkgId -> pkgId != null)
                .distinct()
                .forEach(srcId -> verifyPackageOwnership(srcId, user));
        }

        questions.forEach(q -> q.setPackageId(targetId));
        questionRepository.saveAll(questions);

        return ResponseEntity.ok(ApiResponse.success("Đã di chuyển", "Câu hỏi đã được di chuyển thành công"));
    }
    
    @Operation(summary = "Search packages")
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<PackageDTO>>> searchPackages(
            @RequestParam(required = false) String keyword,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        if (keyword == null || keyword.isBlank()) {
             return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
        org.springframework.data.domain.Page<com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity> page =
            packageRepository.findByNameContainingIgnoreCase(keyword, org.springframework.data.domain.Pageable.ofSize(20));

        // Filter by visibility + ownership (same as getAllPackages) to prevent data leakage
        java.util.List<com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity> filtered;
        if (isAdminRole(user)) {
            filtered = page.getContent();
        } else {
            filtered = page.getContent().stream()
                    .filter(p -> p.getVisibility() == com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity.Visibility.PUBLIC
                            || p.getOwnerId().equals(user.getId()))
                    .toList();
        }

        List<PackageDTO> dtos = filtered.stream().map(this::toDTO).toList();
        return ResponseEntity.ok(ApiResponse.success(dtos, "Kết quả tìm kiếm"));
    }

    // === Ownership Helpers ===

    private boolean isAdminRole(com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        return user.getRole() == com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity.UserRole.ADMIN
            || user.getRole() == com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private void verifyPackageOwnership(java.util.UUID packageId, com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity user) {
        if (isAdminRole(user)) return;
        var pkg = packageRepository.findById(packageId)
            .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Gói câu hỏi", packageId));
        if (!pkg.getOwnerId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không sở hữu gói câu hỏi này");
        }
    }

    // === Helpers ===

    private List<PackageDTO> batchMapPackages(List<com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity> entities) {
        // Batch-fetch owner names
        java.util.Set<java.util.UUID> ownerIds = entities.stream()
                .map(e -> e.getOwnerId()).filter(java.util.Objects::nonNull).collect(java.util.stream.Collectors.toSet());
        java.util.Map<java.util.UUID, String> ownerNameMap = ownerIds.isEmpty() ? Map.of() :
                userRepository.findAllById(ownerIds).stream()
                        .collect(java.util.stream.Collectors.toMap(u -> u.getId(), u -> u.getFullName()));

        // Batch-fetch question counts
        java.util.Map<java.util.UUID, Integer> questionCountMap = new java.util.HashMap<>();
        for (var entity : entities) {
            questionCountMap.put(entity.getId(), (int) questionRepository.countByPackageId(entity.getId()));
        }

        return entities.stream().map(entity -> {
            String ownerName = entity.getOwnerId() != null ? ownerNameMap.getOrDefault(entity.getOwnerId(), "Unknown") : "Unknown";
            int questionCount = questionCountMap.getOrDefault(entity.getId(), 0);
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
        }).toList();
    }

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
        @NotBlank(message = "Tên không được để trống")
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
        @NotEmpty(message = "Danh sách câu hỏi không được để trống")
        private List<String> questionIds;
        private String targetPackageId;
    }
}
