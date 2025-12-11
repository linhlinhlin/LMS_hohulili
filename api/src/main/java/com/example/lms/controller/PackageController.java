package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.dto.PackageDTO;
import com.example.lms.entity.Package;
import com.example.lms.entity.User;
import com.example.lms.service.PackageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/packages")
@RequiredArgsConstructor
@Tag(name = "Package Management", description = "API quản lý gói câu hỏi")
@SecurityRequirement(name = "Bearer Authentication")
public class PackageController {

    private final PackageService packageService;

    @PostMapping
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Tạo gói câu hỏi mới", description = "Giảng viên tạo gói để tổ chức câu hỏi")
    public ResponseEntity<ApiResponse<PackageDTO>> createPackage(
            @AuthenticationPrincipal User currentUser,
            @RequestBody CreatePackageRequest request
    ) {
        try {
            System.out.println("🔍 Create Package - User: " + currentUser.getUsername());
            System.out.println("   - Package name: " + request.getName());
            
            Package packageEntity = packageService.createPackage(
                    currentUser,
                    request.getName(),
                    request.getDescription(),
                    request.getSubject(),
                    request.getCapacity(),
                    request.getVisibility()
            );
            
            PackageDTO dto = PackageDTO.fromEntity(packageEntity);
            System.out.println("✅ Package created: " + packageEntity.getId());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(dto));
        } catch (RuntimeException e) {
            System.out.println("❌ Error creating package: " + e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Lấy danh sách gói", description = "Lấy danh sách gói có thể truy cập")
    public ResponseEntity<ApiResponse<List<PackageDTO>>> getPackages(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        try {
            List<Package> packages;
            
            if (search != null && !search.trim().isEmpty()) {
                // Search by name
                packages = packageService.searchPackages(search, currentUser);
            } else if (subject != null && !subject.trim().isEmpty()) {
                // Filter by subject
                packages = packageService.getPackagesBySubject(subject);
            } else {
                // Get all accessible packages
                Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
                Page<Package> packagePage = packageService.getAccessiblePackages(currentUser, pageable);
                packages = packagePage.getContent();
            }
            
            List<PackageDTO> dtos = packages.stream()
                    .map(PackageDTO::fromEntity)
                    .collect(Collectors.toList());
            
            System.out.println("📦 Found " + dtos.size() + " packages for user " + currentUser.getUsername());
            return ResponseEntity.ok(ApiResponse.success(dtos));
        } catch (RuntimeException e) {
            System.out.println("❌ Error getting packages: " + e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/with-counts")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Lấy danh sách gói kèm số lượng câu hỏi", description = "Dùng cho sidebar")
    public ResponseEntity<ApiResponse<List<PackageDTO>>> getPackagesWithCounts(
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            List<Object[]> results = packageService.getAccessiblePackagesWithCount(currentUser);
            
            List<PackageDTO> dtos = results.stream()
                    .map(result -> {
                        Package pkg = (Package) result[0];
                        Long count = (Long) result[1];
                        return PackageDTO.fromEntityWithCount(pkg, count);
                    })
                    .collect(Collectors.toList());
            
            System.out.println("📦 Found " + dtos.size() + " packages with counts");
            return ResponseEntity.ok(ApiResponse.success(dtos));
        } catch (RuntimeException e) {
            System.out.println("❌ Error getting packages with counts: " + e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Lấy chi tiết gói", description = "Lấy thông tin chi tiết của một gói")
    public ResponseEntity<ApiResponse<PackageDTO>> getPackage(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            Package packageEntity = packageService.getPackageByIdWithAccessCheck(id, currentUser);
            PackageDTO dto = PackageDTO.fromEntity(packageEntity);
            return ResponseEntity.ok(ApiResponse.success(dto));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Cập nhật gói", description = "Chỉnh sửa thông tin gói")
    public ResponseEntity<ApiResponse<PackageDTO>> updatePackage(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser,
            @RequestBody UpdatePackageRequest request
    ) {
        try {
            Package packageEntity = packageService.updatePackage(
                    id,
                    currentUser,
                    request.getName(),
                    request.getDescription(),
                    request.getSubject(),
                    request.getCapacity(),
                    request.getVisibility()
            );
            
            PackageDTO dto = PackageDTO.fromEntity(packageEntity);
            return ResponseEntity.ok(ApiResponse.success(dto));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Xóa gói", description = "Xóa gói và chuyển câu hỏi sang gói khác")
    public ResponseEntity<ApiResponse<String>> deletePackage(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) UUID reassignTo
    ) {
        try {
            packageService.deletePackage(id, currentUser, reassignTo);
            return ResponseEntity.ok(ApiResponse.success("Gói đã được xóa thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/my-packages")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Lấy gói của tôi", description = "Lấy danh sách gói do người dùng tạo")
    public ResponseEntity<ApiResponse<List<PackageDTO>>> getMyPackages(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
            Page<Package> packagePage = packageService.getPackagesByOwner(currentUser, pageable);
            
            List<PackageDTO> dtos = packagePage.getContent().stream()
                    .map(PackageDTO::fromEntity)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(ApiResponse.success(dtos));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/default")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Lấy gói mặc định", description = "Lấy gói 'Chưa phân loại'")
    public ResponseEntity<ApiResponse<PackageDTO>> getDefaultPackage() {
        try {
            Package packageEntity = packageService.getDefaultPackage();
            PackageDTO dto = PackageDTO.fromEntity(packageEntity);
            return ResponseEntity.ok(ApiResponse.success(dto));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Thống kê gói", description = "Lấy thống kê về gói của người dùng")
    public ResponseEntity<ApiResponse<PackageService.PackageStats>> getPackageStats(
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            PackageService.PackageStats stats = packageService.getPackageStats(currentUser);
            return ResponseEntity.ok(ApiResponse.success(stats));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}/questions")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Lấy câu hỏi trong gói", description = "Lấy danh sách câu hỏi thuộc gói")
    public ResponseEntity<ApiResponse<List<com.example.lms.dto.QuestionDTO>>> getQuestionsInPackage(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            List<com.example.lms.entity.Question> questions = packageService.getQuestionsInPackage(id, currentUser);
            
            List<com.example.lms.dto.QuestionDTO> dtos = questions.stream()
                    .map(com.example.lms.dto.QuestionDTO::fromEntity)
                    .collect(Collectors.toList());
            
            System.out.println("📦 Found " + dtos.size() + " questions in package " + id);
            return ResponseEntity.ok(ApiResponse.success(dtos));
        } catch (RuntimeException e) {
            System.out.println("❌ Error getting questions in package: " + e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/move-questions")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Di chuyển câu hỏi", description = "Di chuyển nhiều câu hỏi sang gói khác")
    public ResponseEntity<ApiResponse<String>> moveQuestions(
            @AuthenticationPrincipal User currentUser,
            @RequestBody MoveQuestionsRequest request
    ) {
        try {
            packageService.moveQuestionsToPackage(
                    request.getQuestionIds(),
                    request.getTargetPackageId(),
                    currentUser
            );
            
            String message = String.format("Đã di chuyển %d câu hỏi thành công", request.getQuestionIds().size());
            return ResponseEntity.ok(ApiResponse.success(message));
        } catch (RuntimeException e) {
            System.out.println("❌ Error moving questions: " + e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Tìm kiếm gói", description = "Tìm kiếm gói theo tên")
    public ResponseEntity<ApiResponse<List<PackageDTO>>> searchPackages(
            @AuthenticationPrincipal User currentUser,
            @RequestParam String keyword
    ) {
        try {
            List<Package> packages = packageService.searchPackages(keyword, currentUser);
            
            List<PackageDTO> dtos = packages.stream()
                    .map(PackageDTO::fromEntity)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(ApiResponse.success(dtos));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // DTOs
    public static class CreatePackageRequest {
        private String name;
        private String description;
        private String subject;
        private Integer capacity;
        private Package.Visibility visibility;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }
        public Integer getCapacity() { return capacity; }
        public void setCapacity(Integer capacity) { this.capacity = capacity; }
        public Package.Visibility getVisibility() { return visibility; }
        public void setVisibility(Package.Visibility visibility) { this.visibility = visibility; }
    }

    public static class UpdatePackageRequest {
        private String name;
        private String description;
        private String subject;
        private Integer capacity;
        private Package.Visibility visibility;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }
        public Integer getCapacity() { return capacity; }
        public void setCapacity(Integer capacity) { this.capacity = capacity; }
        public Package.Visibility getVisibility() { return visibility; }
        public void setVisibility(Package.Visibility visibility) { this.visibility = visibility; }
    }

    public static class MoveQuestionsRequest {
        private List<UUID> questionIds;
        private UUID targetPackageId;

        public List<UUID> getQuestionIds() { return questionIds; }
        public void setQuestionIds(List<UUID> questionIds) { this.questionIds = questionIds; }
        public UUID getTargetPackageId() { return targetPackageId; }
        public void setTargetPackageId(UUID targetPackageId) { this.targetPackageId = targetPackageId; }
    }
}
