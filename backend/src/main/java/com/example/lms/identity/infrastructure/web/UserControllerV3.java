package com.example.lms.identity.infrastructure.web;

import com.example.lms.identity.application.usecase.UpdateUserUseCaseV3;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * User Controller V3 - Admin User Management
 *
 * Provides endpoints for admin to manage all users in the system.
 */
@RestController
@RequestMapping("/api/v3/users")
@RequiredArgsConstructor
@Tag(name = "Admin - Users", description = "Admin user management endpoints")
public class UserControllerV3 {

    private final UserJpaRepository userRepository;
    private final UpdateUserUseCaseV3 updateUserUseCaseV3;
    private final PasswordEncoder passwordEncoder;
    private final JpaEnrollmentRepository enrollmentRepository;
    private final JpaCourseRepository courseRepository;

    @Operation(summary = "Get all users with pagination and filtering")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status
    ) {
        PageRequest pageable = PageRequest.of(Math.max(0, page - 1), limit);

        Page<UserJpaEntity> users;
        if (role != null && !role.isBlank() && search != null && !search.isBlank()) {
            UserJpaEntity.UserRole roleEnum = UserJpaEntity.UserRole.valueOf(role.toUpperCase());
            users = userRepository.searchUsersByRole(roleEnum, search, pageable);
        } else if (role != null && !role.isBlank()) {
            UserJpaEntity.UserRole roleEnum = UserJpaEntity.UserRole.valueOf(role.toUpperCase());
            users = userRepository.findByRole(roleEnum, pageable);
        } else if (search != null && !search.isBlank()) {
            users = userRepository.searchUsersByKeyword(search, pageable);
        } else {
            users = userRepository.findAll(pageable);
        }

        Page<UserResponse> response = users.map(this::toResponse);
        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách người dùng"));
    }

    @Operation(summary = "Get all users without pagination")
    @GetMapping("/list/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsersNoPagination() {
        List<UserJpaEntity> users = userRepository.findAll();
        List<UserResponse> response = users.stream().map(this::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách tất cả người dùng"));
    }

    @Operation(summary = "Search users by role")
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> searchUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit
    ) {
        PageRequest pageable = PageRequest.of(Math.max(0, page - 1), limit);

        Page<UserJpaEntity> users;
        if (role != null && !role.isBlank() && q != null && !q.isBlank()) {
            UserJpaEntity.UserRole roleEnum = UserJpaEntity.UserRole.valueOf(role.toUpperCase());
            users = userRepository.searchUsersByRole(roleEnum, q, pageable);
        } else if (role != null && !role.isBlank()) {
            UserJpaEntity.UserRole roleEnum = UserJpaEntity.UserRole.valueOf(role.toUpperCase());
            users = userRepository.findByRole(roleEnum, pageable);
        } else if (q != null && !q.isBlank()) {
            users = userRepository.searchUsersByKeyword(q, pageable);
        } else {
            users = userRepository.findAll(pageable);
        }

        Page<UserResponse> response = users.map(this::toResponse);
        return ResponseEntity.ok(ApiResponse.success(response, "Tìm thấy người dùng"));
    }

    @Operation(summary = "Get all instructors")
    @GetMapping("/instructors")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getInstructors() {
        List<UserJpaEntity> instructors = userRepository.findByRole(UserJpaEntity.UserRole.TEACHER);
        List<UserResponse> response = instructors.stream().map(this::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách giảng viên"));
    }

    @Operation(summary = "Get user by ID")
    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID userId) {
        return userRepository.findById(userId)
                .map(user -> ResponseEntity.ok(ApiResponse.success(toResponse(user), "Thông tin người dùng")))
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Create a new user (admin)")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        // Business guard: ORG_ADMIN can only create TEACHER/STUDENT
        UserJpaEntity.UserRole targetRole = UserJpaEntity.UserRole.valueOf(request.getRole().toUpperCase());
        if (isOrgAdmin(currentUser) && isAdminRole(targetRole)) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Chuyên viên quản lý không thể tạo tài khoản quản trị"));
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Email đã tồn tại"));
        }

        UserJpaEntity user = new UserJpaEntity(
                UUID.randomUUID(),
                request.getEmail(),
                request.getEmail(),
                passwordEncoder.encode(request.getPassword()),
                request.getFullName(),
                targetRole,
                true,
                java.time.Instant.now(),
                null
        );

        UserJpaEntity saved = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(toResponse(saved), "Tạo tài khoản thành công"));
    }

    @Operation(summary = "Update user")
    @PutMapping("/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        // Business guard: ORG_ADMIN cannot modify ADMIN/ORG_ADMIN users
        if (isOrgAdmin(currentUser)) {
            Optional<UserJpaEntity> target = userRepository.findById(userId);
            if (target.isPresent() && isAdminRole(target.get().getRole())) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Chuyên viên quản lý không thể chỉnh sửa tài khoản quản trị"));
            }
            // Escalation prevention: ORG_ADMIN cannot SET role to ADMIN/ORG_ADMIN
            if (request.getRole() != null) {
                try {
                    UserJpaEntity.UserRole requestedRole = UserJpaEntity.UserRole.valueOf(request.getRole().toUpperCase());
                    if (isAdminRole(requestedRole)) {
                        return ResponseEntity.status(403)
                                .body(ApiResponse.error("Chuyên viên quản lý không thể nâng cấp vai trò lên quản trị"));
                    }
                } catch (IllegalArgumentException ignored) { }
            }
        }

        var command = new UpdateUserUseCaseV3.Command(
                request.getFullName(),
                request.getRole(),
                request.getEnabled()
        );
        return updateUserUseCaseV3.execute(userId, command)
                .map(user -> ResponseEntity.ok(ApiResponse.success(toResponse(user), "Cập nhật tài khoản thành công")))
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Toggle user enabled/disabled status")
    @PatchMapping("/{userId}/toggle-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> toggleUserStatus(
            @PathVariable UUID userId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        return userRepository.findById(userId)
                .map(user -> {
                    // Business guard: ORG_ADMIN cannot toggle ADMIN/ORG_ADMIN
                    if (isOrgAdmin(currentUser) && isAdminRole(user.getRole())) {
                        return ResponseEntity.status(403)
                                .body(ApiResponse.<UserResponse>error("Chuyên viên quản lý không thể thay đổi trạng thái tài khoản quản trị"));
                    }
                    user.setEnabled(!user.isEnabled());
                    UserJpaEntity saved = userRepository.save(user);
                    return ResponseEntity.ok(ApiResponse.success(toResponse(saved), "Đã thay đổi trạng thái tài khoản"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Delete user")
    @DeleteMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable UUID userId) {
        if (userRepository.existsById(userId)) {
            userRepository.deleteById(userId);
            return ResponseEntity.ok(ApiResponse.success("Đã xóa", "Tài khoản đã được xóa thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @Operation(summary = "Update user account status (ACTIVE, BLOCKED, RESTRICTED)")
    @PatchMapping("/{userId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserStatus(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateStatusRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        return userRepository.findById(userId)
                .map(user -> {
                    // Business guard: ORG_ADMIN cannot change status of ADMIN/ORG_ADMIN
                    if (isOrgAdmin(currentUser) && isAdminRole(user.getRole())) {
                        return ResponseEntity.status(403)
                                .body(ApiResponse.<UserResponse>error("Chuyên viên quản lý không thể thay đổi trạng thái tài khoản quản trị"));
                    }
                    boolean enabled = "ACTIVE".equalsIgnoreCase(request.getStatus());
                    user.setEnabled(enabled);
                    UserJpaEntity saved = userRepository.save(user);
                    return ResponseEntity.ok(ApiResponse.success(toResponse(saved),
                            "Trạng thái tài khoản đã cập nhật thành " + request.getStatus()));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Get enrolled courses for a user (admin view)")
    @GetMapping("/{userId}/enrolled-courses")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getUserEnrolledCourses(
            @PathVariable UUID userId
    ) {
        List<EnrollmentJpaEntity> enrollments = enrollmentRepository.findActiveWithClass(userId);

        // Group enrollments by courseId, keep the one with highest progress
        Map<UUID, EnrollmentJpaEntity> bestEnrollmentByCourse = new LinkedHashMap<>();
        for (EnrollmentJpaEntity enrollment : enrollments) {
            UUID courseId = enrollment.getLearningClass().getCourseId();
            bestEnrollmentByCourse.merge(courseId, enrollment, (existing, current) -> {
                int existingPct = existing.getCompletionPercent() != null ? existing.getCompletionPercent() : 0;
                int currentPct = current.getCompletionPercent() != null ? current.getCompletionPercent() : 0;
                return currentPct > existingPct ? current : existing;
            });
        }

        List<Map<String, Object>> courses = bestEnrollmentByCourse.entrySet().stream()
                .map(entry -> {
                    UUID courseId = entry.getKey();
                    EnrollmentJpaEntity enrollment = entry.getValue();
                    return courseRepository.findById(courseId)
                            .map(course -> {
                                Map<String, Object> map = toCourseMap(course);
                                map.put("completionPercent", enrollment.getCompletionPercent() != null ? enrollment.getCompletionPercent() : 0);
                                map.put("enrolledAt", enrollment.getEnrolledAt() != null ? enrollment.getEnrolledAt().toString() : null);
                                map.put("enrollmentStatus", enrollment.getStatus() != null ? enrollment.getStatus().name() : "ACTIVE");
                                return map;
                            })
                            .orElse(null);
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(courses, "Danh sách khóa học đã đăng ký"));
    }

    @Operation(summary = "Get managed courses for a teacher (admin view)")
    @GetMapping("/{userId}/managed-courses")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getUserManagedCourses(
            @PathVariable UUID userId
    ) {
        Page<CourseJpaEntity> page = courseRepository.findByTeacherId(userId, Pageable.unpaged());
        List<Map<String, Object>> courses = page.getContent().stream()
                .map(this::toCourseMap)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(courses, "Danh sách khóa học quản lý"));
    }

    @Operation(summary = "Get co-op courses for a teacher (admin view)")
    @GetMapping("/{userId}/coop-courses")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getUserCoopCourses(
            @PathVariable UUID userId
    ) {
        // Co-op course feature is basic - return empty list for now
        return ResponseEntity.ok(ApiResponse.success(List.of(), "Danh sách khóa học hợp tác"));
    }

    private Map<String, Object> toCourseMap(CourseJpaEntity course) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", course.getId().toString());
        map.put("code", course.getCode());
        map.put("title", course.getTitle());
        map.put("status", course.getStatus() != null ? course.getStatus().name().toLowerCase() : "draft");
        map.put("createdAt", course.getCreatedAt() != null ? course.getCreatedAt().toString() : null);

        // Enrich with teacher info
        if (course.getTeacherId() != null) {
            userRepository.findById(course.getTeacherId()).ifPresent(teacher -> {
                map.put("teacherName", teacher.getFullName());
                map.put("teacherEmail", teacher.getEmail());
            });
        }

        // Enrollment count
        try {
            long enrolledCount = enrollmentRepository.findByLearningClass_CourseId(course.getId()).size();
            map.put("enrolledCount", enrolledCount);
        } catch (org.springframework.dao.DataAccessException e) {
            map.put("enrolledCount", 0);
        }

        return map;
    }

    private UserResponse toResponse(UserJpaEntity user) {
        return UserResponse.builder()
                .id(user.getId().toString())
                .username(user.getUsername())
                .email(user.getEmail())
                .name(user.getFullName())
                .fullName(user.getFullName())
                .role(user.getRole() != null ? user.getRole().name().toLowerCase() : "student")
                .isActive(user.isEnabled())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .updatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : null)
                .build();
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId().value().toString())
                .username(user.getUsername())
                .email(user.getEmail().getValue())
                .name(user.getFullName())
                .fullName(user.getFullName())
                .role(user.getRole() != null ? user.getRole().name().toLowerCase() : "student")
                .isActive(user.isEnabled())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .updatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : null)
                .build();
    }

    // === Business Guard Helpers ===

    private boolean isOrgAdmin(UserJpaEntity user) {
        return user != null && user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private boolean isAdminRole(UserJpaEntity.UserRole role) {
        return role == UserJpaEntity.UserRole.ADMIN || role == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    // === DTOs ===

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserResponse {
        private String id;
        private String username;
        private String email;
        private String name;
        private String fullName;
        private String role;
        private String avatar;
        private String department;
        private boolean isActive;
        private boolean enabled;
        private String createdAt;
        private String updatedAt;
        private String lastLogin;
        private int loginCount;
        private int coursesCreated;
        private int coursesEnrolled;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class CreateUserRequest {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        private String email;

        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 255, message = "Họ tên không được quá 255 ký tự")
        private String fullName;

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
        private String password;

        @NotBlank(message = "Vai trò không được để trống")
        private String role;

        private String username;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class UpdateUserRequest {
        @Size(max = 255, message = "Họ tên không được quá 255 ký tự")
        private String fullName;
        private String role;
        private Boolean enabled;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class UpdateStatusRequest {
        @NotBlank(message = "Trạng thái không được để trống")
        private String status; // ACTIVE, BLOCKED, RESTRICTED
        private String reason;
    }
}
