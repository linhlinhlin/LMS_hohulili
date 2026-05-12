package com.example.lms.identity.infrastructure.web;

import com.example.lms.identity.application.usecase.UpdateUserUseCaseV3;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.valueobject.PasswordPolicy;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.OrganizationJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.OrganizationJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import org.apache.poi.EncryptedDocumentException;
import org.apache.poi.ooxml.POIXMLException;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.time.Instant;
import jakarta.persistence.criteria.Predicate;
import java.util.*;
import java.util.Locale;
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

    private static final String DEFAULT_IMPORT_PASSWORD = "Password123!";

    private final UserJpaRepository userRepository;
    private final UpdateUserUseCaseV3 updateUserUseCaseV3;
    private final PasswordEncoder passwordEncoder;
    private final JpaEnrollmentRepository enrollmentRepository;
    private final JpaCourseRepository courseRepository;
    private final OrganizationJpaRepository organizationRepository;

    @Operation(summary = "Get all users with pagination and filtering")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String roles,
            @RequestParam(required = false) String status,
            // Issue #229: ADMIN có thể filter user theo tổ chức cụ thể.
            // ORG_ADMIN auto-scoped tới organization của họ — param này
            // bị ignore cho ORG_ADMIN role (security: không cho cross-org).
            @RequestParam(required = false) UUID organizationId,
            @RequestParam(defaultValue = "false") boolean systemOnly,
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        PageRequest pageable = PageRequest.of(Math.max(0, page - 1), limit);

        Set<UserJpaEntity.UserRole> roleFilter = parseRoleFilter(role, roles);
        if (roleFilter == null) {
            return badRequest("Vai trò không hợp lệ");
        }

        String normalizedStatus = normalizeStatus(status);
        if (status != null && !status.isBlank() && normalizedStatus == null) {
            return badRequest("Trạng thái không hợp lệ");
        }

        if (isOrgAdminWithoutOrganization(currentUser)) {
            return forbidden("Chuyên viên quản lý phải thuộc một tổ chức để xem danh sách người dùng");
        }

        Page<UserJpaEntity> users = queryUsers(
                currentUser,
                roleFilter,
                search,
                normalizedStatus,
                organizationId,
                systemOnly,
                pageable
        );

        // Issue #229: batch lookup org names cho mọi user trong page có
        // organizationId (avoid N+1 query). System ADMIN không thuộc org
        // sẽ có organizationId=null và không cần lookup.
        Map<UUID, String> orgNameMap = buildOrgNameMap(users.getContent());
        Page<UserResponse> response = users.map(u -> toResponse(u, orgNameMap));

        // Issue #190 (F-T1): hydrate coursesCreated for TEACHER rows so the
        // teacher-management KPI strip ("Đang dạy", "Khóa học") shows real
        // numbers instead of zeros. Batched to a single SQL aggregate.
        enrichTeacherCourseCounts(response.getContent());
        enrichStudentCourseCounts(response.getContent());
        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách người dùng"));
    }

    /**
     * Query users with role, status, search, and organization filters in one
     * specification so every list surface gets consistent pagination totals.
     */
    private Page<UserJpaEntity> queryUsers(UserJpaEntity currentUser,
                                           Set<UserJpaEntity.UserRole> roles,
                                           String search,
                                           String status,
                                           UUID organizationId,
                                           boolean systemOnly,
                                           Pageable pageable) {
        Specification<UserJpaEntity> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (isOrgAdmin(currentUser)) {
                predicates.add(cb.equal(root.get("organizationId"), currentUser.getOrganizationId()));
            } else if (systemOnly) {
                predicates.add(cb.isNull(root.get("organizationId")));
            } else if (organizationId != null) {
                predicates.add(cb.equal(root.get("organizationId"), organizationId));
            }

            if (roles != null && !roles.isEmpty()) {
                predicates.add(root.get("role").in(roles));
            }

            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("email")), like),
                        cb.like(cb.lower(root.get("fullName")), like),
                        cb.like(cb.lower(root.get("username")), like)
                ));
            }

            if (status != null && !status.isBlank()) {
                if ("ACTIVE".equals(status)) {
                    predicates.add(cb.or(
                            cb.equal(root.get("accountStatus"), status),
                            cb.and(cb.isNull(root.get("accountStatus")), cb.isTrue(root.get("enabled")))
                    ));
                } else if ("BLOCKED".equals(status)) {
                    predicates.add(cb.or(
                            cb.equal(root.get("accountStatus"), status),
                            cb.and(cb.isNull(root.get("accountStatus")), cb.isFalse(root.get("enabled")))
                    ));
                } else {
                    predicates.add(cb.equal(root.get("accountStatus"), status));
                }
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };

        return userRepository.findAll(spec, pageable);
    }

    /**
     * Issue #229: batch lookup org names cho 1 page user — tránh N+1 query
     * khi convert per-row toResponse. Trả empty map nếu không user nào
     * có organizationId (vd page chỉ có system ADMIN).
     */
    private Map<UUID, String> buildOrgNameMap(Collection<UserJpaEntity> users) {
        Set<UUID> orgIds = users.stream()
                .map(UserJpaEntity::getOrganizationId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        if (orgIds.isEmpty()) return Map.of();
        return organizationRepository.findAllById(orgIds).stream()
                .collect(Collectors.toMap(OrganizationJpaEntity::getId, OrganizationJpaEntity::getName));
    }

    private String resolveAccountStatus(UserJpaEntity user) {
        String status = user.getAccountStatus();
        if (status != null && !status.isBlank()) {
            return status.trim().toUpperCase(Locale.ROOT);
        }
        return user.isEnabled() ? "ACTIVE" : "BLOCKED";
    }

    @Operation(summary = "Get all users (capped at 1000)")
    @GetMapping("/list/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsersNoPagination(
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        if (isOrgAdminWithoutOrganization(currentUser)) {
            return forbidden("Chuyên viên quản lý phải thuộc một tổ chức để xem danh sách người dùng");
        }

        Page<UserJpaEntity> page;
        if (isOrgAdmin(currentUser)) {
            page = userRepository.findByOrganizationId(currentUser.getOrganizationId(), PageRequest.of(0, 1000));
        } else {
            page = userRepository.findAll(PageRequest.of(0, 1000));
        }
        List<UserResponse> response = page.getContent().stream().map(this::toResponse).toList();
        enrichTeacherCourseCounts(response);
        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách tất cả người dùng"));
    }

    @Operation(summary = "Search users by role")
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> searchUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        // OWASP: Cap page size to prevent bulk enumeration
        int safeLimit = Math.min(Math.max(1, limit), 50);
        PageRequest pageable = PageRequest.of(Math.max(0, page - 1), safeLimit);

        boolean hasRole = role != null && !role.isBlank();
        boolean hasSearch = q != null && !q.isBlank();
        UserJpaEntity.UserRole roleEnum = null;

        if (hasRole) {
            roleEnum = parseRole(role);
            if (roleEnum == null) {
                return badRequest("Vai trò không hợp lệ");
            }
        }

        if (isOrgAdminWithoutOrganization(currentUser)) {
            return forbidden("Chuyên viên quản lý phải thuộc một tổ chức để tìm kiếm người dùng");
        }
        if (currentUser != null && currentUser.getRole() == UserJpaEntity.UserRole.TEACHER) {
            if (hasRole && roleEnum != UserJpaEntity.UserRole.TEACHER) {
                return forbidden("Giảng viên chỉ có thể tìm kiếm giảng viên");
            }
            hasRole = true;
            roleEnum = UserJpaEntity.UserRole.TEACHER;
        }

        Page<UserJpaEntity> users;

        // ORG_ADMIN: filter to users within their organization
        if (isOrgAdmin(currentUser)) {
            UUID orgId = currentUser.getOrganizationId();
            if (hasRole && hasSearch) {
                users = userRepository.searchByOrganizationIdAndRoleAndKeyword(orgId, roleEnum, q, pageable);
            } else if (hasRole) {
                users = userRepository.findByOrganizationIdAndRole(orgId, roleEnum, pageable);
            } else if (hasSearch) {
                users = userRepository.searchByOrganizationIdAndKeyword(orgId, q, pageable);
            } else {
                users = userRepository.findByOrganizationId(orgId, pageable);
            }
        } else {
            // ADMIN/TEACHER: unchanged
            if (hasRole && hasSearch) {
                users = userRepository.searchUsersByRole(roleEnum, q, pageable);
            } else if (hasRole) {
                users = userRepository.findByRole(roleEnum, pageable);
            } else if (hasSearch) {
                users = userRepository.searchUsersByKeyword(q, pageable);
            } else {
                users = userRepository.findAll(pageable);
            }
        }

        // OWASP: Mask email for non-admin callers (prevent email enumeration)
        boolean maskEmail = currentUser != null && currentUser.getRole() == UserJpaEntity.UserRole.TEACHER;
        Page<UserResponse> response = users.map(u -> {
            UserResponse r = toResponse(u);
            if (maskEmail) {
                r.setEmail(maskEmail(u.getEmail()));
            }
            return r;
        });
        enrichTeacherCourseCounts(response.getContent());
        return ResponseEntity.ok(ApiResponse.success(response, "Tìm thấy người dùng"));
    }

    /** Mask email: "teacher@maritime.edu" → "te*****@maritime.edu" */
    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***@***.***";
        String[] parts = email.split("@");
        String local = parts[0];
        String masked = local.length() <= 2
                ? local.charAt(0) + "*****"
                : local.substring(0, 2) + "*****";
        return masked + "@" + parts[1];
    }

    @Operation(summary = "Get all instructors")
    @GetMapping("/instructors")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getInstructors(
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        if (isOrgAdminWithoutOrganization(currentUser)) {
            return forbidden("Chuyên viên quản lý phải thuộc một tổ chức để xem danh sách giảng viên");
        }

        List<UserJpaEntity> instructors = isOrgAdmin(currentUser)
                ? userRepository.findByOrganizationId(currentUser.getOrganizationId()).stream()
                        .filter(user -> user.getRole() == UserJpaEntity.UserRole.TEACHER)
                        .toList()
                : userRepository.findByRole(UserJpaEntity.UserRole.TEACHER);

        // OWASP: Cap at 100 to prevent bulk enumeration, mask email for teachers
        boolean maskEmails = currentUser != null && currentUser.getRole() == UserJpaEntity.UserRole.TEACHER;
        List<UserResponse> response = instructors.stream()
                .limit(100)
                .map(u -> {
                    UserResponse r = toResponse(u);
                    if (maskEmails) r.setEmail(maskEmail(u.getEmail()));
                    return r;
                })
                .toList();
        enrichTeacherCourseCounts(response);
        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách giảng viên"));
    }

    @Operation(summary = "Get user by ID")
    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(
            @PathVariable UUID userId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        if (isOrgAdminWithoutOrganization(currentUser)) {
            return forbidden("Chuyên viên quản lý phải thuộc một tổ chức để xem người dùng");
        }

        Optional<UserJpaEntity> target = userRepository.findById(userId);
        if (target.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.error("ENTITY_NOT_FOUND", "Không tìm thấy người dùng"));
        }
        if (!canAccessUser(currentUser, target.get())) {
            return forbidden("Bạn không có quyền xem người dùng này");
        }

        return ResponseEntity.ok(ApiResponse.success(toResponse(target.get()), "Thông tin người dùng"));
    }

    @Operation(summary = "Create a new user (admin)")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        UserJpaEntity.UserRole targetRole = parseRole(request.getRole());
        if (targetRole == null) {
            return badRequest("Vai trò không hợp lệ");
        }

        String username = resolveUsername(request.getUsername(), request.getEmail());
        String validationError = validateUserProvisioningRequest(
                request.getEmail(),
                request.getFullName(),
                request.getPassword(),
                username,
                targetRole,
                currentUser
        );
        if (validationError != null) {
            return isForbiddenProvisioningError(validationError) ? forbidden(validationError) : badRequest(validationError);
        }

        UserJpaEntity saved = userRepository.save(buildUserEntity(
                username,
                request.getEmail().trim(),
                request.getPassword(),
                request.getFullName().trim(),
                targetRole,
                currentUser
        ));
        return ResponseEntity.ok(ApiResponse.success(toResponse(saved), "Tạo tài khoản thành công"));
    }

    @Operation(summary = "Bulk import users from Excel")
    @PostMapping("/bulk-import")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<BulkImportResult>> bulkImportUsers(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "STUDENT") String defaultRole,
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        if (isOrgAdminWithoutOrganization(currentUser)) {
            return forbidden("Chuyên viên quản lý phải thuộc một tổ chức để import người dùng");
        }

        UserJpaEntity.UserRole targetRole = parseRole(defaultRole);
        if (targetRole == null) {
            return badRequest("Vai trò mặc định không hợp lệ");
        }
        if (isOrgAdmin(currentUser) && isAdminRole(targetRole)) {
            return forbidden("Chuyên viên quản lý không thể import tài khoản quản trị");
        }
        if (file == null || file.isEmpty()) {
            return badRequest("Vui lòng chọn file Excel để import");
        }
        if (!isExcelFile(file)) {
            return badRequest("Chỉ hỗ trợ file Excel .xlsx hoặc .xls");
        }

        int totalRows = 0;
        int successfulImports = 0;
        int failedImports = 0;
        List<String> errors = new ArrayList<>();

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {
            if (workbook.getNumberOfSheets() == 0) {
                return badRequest("File Excel không chứa sheet dữ liệu");
            }

            var sheet = workbook.getSheetAt(0);
            BulkImportColumnMapping columns = resolveBulkImportColumns(sheet.getRow(sheet.getFirstRowNum()));
            if (columns == null) {
                return badRequest("Template không hợp lệ. Cần tối thiểu cột Email và Full Name");
            }

            for (int rowNum = sheet.getFirstRowNum() + 1; rowNum <= sheet.getLastRowNum(); rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || isBlankRow(row)) {
                    continue;
                }

                totalRows++;
                String email = readCell(row, columns.emailColumn());
                String fullName = readCell(row, columns.fullNameColumn());
                String password = Optional.ofNullable(readCell(row, columns.passwordColumn()))
                        .filter(value -> !value.isBlank())
                        .orElse(DEFAULT_IMPORT_PASSWORD);
                String username = resolveUsername(readCell(row, columns.usernameColumn()), email);

                String validationError = validateUserProvisioningRequest(
                        email,
                        fullName,
                        password,
                        username,
                        targetRole,
                        currentUser
                );
                if (validationError != null) {
                    failedImports++;
                    errors.add("Dòng " + (rowNum + 1) + ": " + validationError);
                    continue;
                }

                try {
                    userRepository.save(buildUserEntity(
                            username,
                            email.trim(),
                            password,
                            fullName.trim(),
                            targetRole,
                            currentUser
                    ));
                    successfulImports++;
                } catch (RuntimeException ex) {
                    failedImports++;
                    errors.add("Dòng " + (rowNum + 1) + ": " + firstMeaningfulMessage(ex, "Không thể tạo người dùng"));
                }
            }
        } catch (IOException | POIXMLException | EncryptedDocumentException ex) {
            return badRequest("Không thể đọc file Excel. Vui lòng kiểm tra định dạng và nội dung file");
        }

        BulkImportResult result = new BulkImportResult(
                totalRows,
                successfulImports,
                failedImports,
                summarizeErrors(errors)
        );
        String message = failedImports == 0
                ? "Đã import " + successfulImports + " người dùng"
                : "Đã import thành công " + successfulImports + "/" + totalRows + " người dùng";
        return ResponseEntity.ok(ApiResponse.success(result, message));
    }

    @Operation(summary = "Update user")
    @PutMapping("/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        if (isOrgAdminWithoutOrganization(currentUser)) {
            return forbidden("Chuyên viên quản lý phải thuộc một tổ chức để chỉnh sửa người dùng");
        }

        if (isOrgAdmin(currentUser)) {
            Optional<UserJpaEntity> target = userRepository.findById(userId);
            if (target.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            if (!canManageUser(currentUser, target.get())) {
                return forbidden("Bạn không có quyền chỉnh sửa người dùng này");
            }
            if (request.getRole() != null) {
                UserJpaEntity.UserRole requestedRole = parseRole(request.getRole());
                if (requestedRole == null) {
                    return badRequest("Vai trò không hợp lệ");
                }
                if (isAdminRole(requestedRole)) {
                    return forbidden("Chuyên viên quản lý không thể nâng cấp vai trò lên quản trị");
                }
            }
        }

        var command = new UpdateUserUseCaseV3.Command(
                request.getFullName(),
                request.getRole(),
                request.getEnabled()
        );
        return updateUserUseCaseV3.execute(userId, command)
                .map(user -> ResponseEntity.ok(ApiResponse.success(toResponse(user), "Cập nhật tài khoản thành công")))
                .orElse(ResponseEntity.<ApiResponse<UserResponse>>notFound().build());
    }

    @Operation(summary = "Toggle user enabled/disabled status")
    @PatchMapping("/{userId}/toggle-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> toggleUserStatus(
            @PathVariable UUID userId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        if (isOrgAdminWithoutOrganization(currentUser)) {
            return forbidden("Chuyên viên quản lý phải thuộc một tổ chức để cập nhật trạng thái người dùng");
        }

        Optional<UserJpaEntity> target = userRepository.findById(userId);
        if (target.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!canManageUser(currentUser, target.get())) {
            return forbidden("Bạn không có quyền thay đổi trạng thái người dùng này");
        }

        target.get().setEnabled(!target.get().isEnabled());
        UserJpaEntity saved = userRepository.save(target.get());
        return ResponseEntity.ok(ApiResponse.success(toResponse(saved), "Đã thay đổi trạng thái tài khoản"));
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
        if (isOrgAdminWithoutOrganization(currentUser)) {
            return forbidden("Chuyên viên quản lý phải thuộc một tổ chức để cập nhật trạng thái người dùng");
        }

        Optional<UserJpaEntity> target = userRepository.findById(userId);
        if (target.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!canManageUser(currentUser, target.get())) {
            return forbidden("Bạn không có quyền thay đổi trạng thái người dùng này");
        }

        String rawStatus = request.getStatus() == null ? "" : request.getStatus().trim().toUpperCase(Locale.ROOT);
        if (!"ACTIVE".equals(rawStatus) && !"BLOCKED".equals(rawStatus) && !"RESTRICTED".equals(rawStatus)) {
            return ResponseEntity.badRequest().body(ApiResponse.error(
                    "Trạng thái không hợp lệ. Cho phép: ACTIVE, BLOCKED, RESTRICTED"));
        }

        UserJpaEntity entity = target.get();
        boolean enabled = "ACTIVE".equals(rawStatus);
        entity.setEnabled(enabled);
        entity.setAccountStatus(rawStatus);
        // RESTRICTED and BLOCKED both deserve an audit trail entry. ACTIVE clears the reason.
        entity.setStatusReason(enabled ? null : (request.getReason() == null ? null : request.getReason().trim()));
        entity.setStatusUpdatedAt(Instant.now());
        UserJpaEntity saved = userRepository.save(entity);

        return ResponseEntity.ok(ApiResponse.success(
                toResponse(saved),
                "Trạng thái tài khoản đã cập nhật thành " + rawStatus
        ));
    }

    @Operation(summary = "Get enrolled courses for a user (admin view)")
    @GetMapping("/{userId}/enrolled-courses")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getUserEnrolledCourses(
            @PathVariable UUID userId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        Optional<UserJpaEntity> target = getAccessibleTargetUser(userId, currentUser);
        if (target.isEmpty()) {
            return userRepository.existsById(userId)
                    ? forbidden("Bạn không có quyền xem khóa học của người dùng này")
                    : ResponseEntity.status(404)
                            .body(ApiResponse.error("ENTITY_NOT_FOUND", "Không tìm thấy người dùng"));
        }

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

        // Batch load courses, teachers, enrollment counts (3 queries instead of 3N)
        Set<UUID> courseIds = bestEnrollmentByCourse.keySet();
        Map<UUID, CourseJpaEntity> courseMap = courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(CourseJpaEntity::getId, c -> c));
        Set<UUID> teacherIds = courseMap.values().stream()
                .map(CourseJpaEntity::getTeacherId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, String> teacherNameMap = userRepository.findAllById(teacherIds).stream()
                .collect(Collectors.toMap(UserJpaEntity::getId, UserJpaEntity::getFullName));
        Map<UUID, Long> enrollCountMap = new HashMap<>();
        if (!courseIds.isEmpty()) {
            enrollmentRepository.countEnrollmentsByCourseIds(new ArrayList<>(courseIds))
                    .forEach(row -> enrollCountMap.put((UUID) row[0], (Long) row[1]));
        }

        List<Map<String, Object>> courses = bestEnrollmentByCourse.entrySet().stream()
                .map(entry -> {
                    UUID courseId = entry.getKey();
                    EnrollmentJpaEntity enrollment = entry.getValue();
                    CourseJpaEntity course = courseMap.get(courseId);
                    if (course == null) return null;
                    Map<String, Object> map = toCourseMapBatch(course, teacherNameMap, enrollCountMap);
                    map.put("completionPercent", enrollment.getCompletionPercent() != null ? enrollment.getCompletionPercent() : 0);
                    map.put("enrolledAt", enrollment.getEnrolledAt() != null ? enrollment.getEnrolledAt().toString() : null);
                    map.put("enrollmentStatus", enrollment.getStatus() != null ? enrollment.getStatus().name() : "ACTIVE");
                    return map;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(courses, "Danh sách khóa học đã đăng ký"));
    }

    @Operation(summary = "Get managed courses for a teacher (admin view)")
    @GetMapping("/{userId}/managed-courses")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getUserManagedCourses(
            @PathVariable UUID userId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        Optional<UserJpaEntity> target = getAccessibleTargetUser(userId, currentUser);
        if (target.isEmpty()) {
            return userRepository.existsById(userId)
                    ? forbidden("Bạn không có quyền xem khóa học của người dùng này")
                    : ResponseEntity.status(404)
                            .body(ApiResponse.error("ENTITY_NOT_FOUND", "Không tìm thấy người dùng"));
        }

        Page<CourseJpaEntity> page = courseRepository.findByTeacherId(userId, Pageable.unpaged());
        List<CourseJpaEntity> courseList = page.getContent();

        Map<UUID, String> teacherNameMap = new HashMap<>();
        teacherNameMap.put(userId, target.get().getFullName());
        List<UUID> courseIds = courseList.stream().map(CourseJpaEntity::getId).toList();
        Map<UUID, Long> enrollCountMap = new HashMap<>();
        if (!courseIds.isEmpty()) {
            enrollmentRepository.countEnrollmentsByCourseIds(courseIds)
                    .forEach(row -> enrollCountMap.put((UUID) row[0], (Long) row[1]));
        }

        List<Map<String, Object>> courses = courseList.stream()
                .map(c -> toCourseMapBatch(c, teacherNameMap, enrollCountMap))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(courses, "Danh sách khóa học quản lý"));
    }

    @Operation(summary = "Get co-op courses for a teacher (admin view)")
    @GetMapping("/{userId}/coop-courses")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getUserCoopCourses(
            @PathVariable UUID userId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        Optional<UserJpaEntity> target = getAccessibleTargetUser(userId, currentUser);
        if (target.isEmpty()) {
            return userRepository.existsById(userId)
                    ? forbidden("Bạn không có quyền xem khóa học của người dùng này")
                    : ResponseEntity.status(404)
                            .body(ApiResponse.error("ENTITY_NOT_FOUND", "Không tìm thấy người dùng"));
        }

        return ResponseEntity.ok(ApiResponse.success(List.of(), "Danh sách khóa học hợp tác"));
    }

    private Map<String, Object> toCourseMapBatch(CourseJpaEntity course,
                                                    Map<UUID, String> teacherNameMap,
                                                    Map<UUID, Long> enrollCountMap) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", course.getId().toString());
        map.put("code", course.getCode());
        map.put("title", course.getTitle());
        map.put("status", course.getStatus() != null ? course.getStatus().name().toLowerCase(Locale.ROOT) : "draft");
        map.put("createdAt", course.getCreatedAt() != null ? course.getCreatedAt().toString() : null);

        if (course.getTeacherId() != null) {
            String teacherName = teacherNameMap.get(course.getTeacherId());
            if (teacherName != null) {
                map.put("teacherName", teacherName);
            }
        }

        map.put("enrolledCount", enrollCountMap.getOrDefault(course.getId(), 0L));
        return map;
    }

    private UserResponse toResponse(UserJpaEntity user) {
        return toResponse(user, Map.of());
    }

    /**
     * Issue #229: overload accept pre-built `orgNameMap` để emit org info.
     * System ADMIN có `organizationId=null` -> trả về null (FE hiển thị
     * badge "Hệ thống" cho row không thuộc org). ORG_ADMIN/TEACHER/STUDENT
     * thuộc org cụ thể -> orgName tra từ map (đã batch query 1 lần ở
     * caller, tránh N+1).
     */
    private UserResponse toResponse(UserJpaEntity user, Map<UUID, String> orgNameMap) {
        UUID orgId = user.getOrganizationId();
        return UserResponse.builder()
                .id(user.getId().toString())
                .username(user.getDisplayName())
                .email(user.getEmail())
                .name(user.getFullName())
                .fullName(user.getFullName())
                .role(user.getRole() != null ? user.getRole().name().toLowerCase(Locale.ROOT) : "student")
                .isActive(user.isEnabled())
                .enabled(user.isEnabled())
                .accountStatus(resolveAccountStatus(user))
                .statusReason(user.getStatusReason())
                .statusUpdatedAt(user.getStatusUpdatedAt() != null ? user.getStatusUpdatedAt().toString() : null)
                .mustChangePassword(user.isMustChangePassword())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .updatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : null)
                .organizationId(orgId != null ? orgId.toString() : null)
                .organizationName(orgId != null ? orgNameMap.get(orgId) : null)
                .build();
    }

    private UserResponse toResponse(User user) {
        // Issue #229: domain User overload — caller (single-user endpoint
        // create/update) thường lookup org riêng nếu cần. Helper trả về
        // organizationId dạng UUID string nhưng KHÔNG resolve org name
        // (caller có thể gọi `organizationRepository.findById` nếu cần).
        UUID orgId = user.getOrganizationId();
        String orgName = null;
        if (orgId != null) {
            orgName = organizationRepository.findById(orgId)
                    .map(OrganizationJpaEntity::getName)
                    .orElse(null);
        }
        return UserResponse.builder()
                .id(user.getId().value().toString())
                .username(user.getUsername())
                .email(user.getEmail().getValue())
                .name(user.getFullName())
                .fullName(user.getFullName())
                .role(user.getRole() != null ? user.getRole().name().toLowerCase(Locale.ROOT) : "student")
                .isActive(user.isEnabled())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .updatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : null)
                .organizationId(orgId != null ? orgId.toString() : null)
                .organizationName(orgName)
                .build();
    }

    // === Enrichment Helpers ===

    /**
     * Hydrate {@code coursesCreated} on every TEACHER row in the page using a
     * single batched aggregate. Other roles are ignored (they get the default
     * 0). Mutates the responses in place — the page wrapper is left untouched.
     *
     * <p>Implements the data side of issue #190 (F-T1) so the teacher
     * management KPI strip ("Đang dạy", "Khóa học") shows real numbers
     * instead of the static zeros the FE was previously summing.
     */
    private void enrichTeacherCourseCounts(java.util.Collection<UserResponse> rows) {
        if (rows == null || rows.isEmpty()) return;

        java.util.Set<UUID> teacherIds = rows.stream()
                .filter(r -> "teacher".equalsIgnoreCase(r.getRole()))
                .map(r -> {
                    try {
                        return UUID.fromString(r.getId());
                    } catch (IllegalArgumentException ex) {
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(java.util.HashSet::new));
        if (teacherIds.isEmpty()) return;

        java.util.Map<UUID, Long> counts = new java.util.HashMap<>(teacherIds.size());
        for (Object[] row : courseRepository.countCoursesByTeacherIds(teacherIds)) {
            if (row == null || row.length < 2 || row[0] == null || row[1] == null) continue;
            counts.put((UUID) row[0], ((Number) row[1]).longValue());
        }

        for (UserResponse r : rows) {
            if (!"teacher".equalsIgnoreCase(r.getRole())) continue;
            try {
                UUID id = UUID.fromString(r.getId());
                r.setCoursesCreated(counts.getOrDefault(id, 0L).intValue());
            } catch (IllegalArgumentException ex) {
                // Leave default 0 if id is somehow malformed.
            }
        }
    }

    private void enrichStudentCourseCounts(java.util.Collection<UserResponse> rows) {
        if (rows == null || rows.isEmpty()) return;

        java.util.Set<UUID> studentIds = rows.stream()
                .filter(r -> "student".equalsIgnoreCase(r.getRole()))
                .map(r -> {
                    try {
                        return UUID.fromString(r.getId());
                    } catch (IllegalArgumentException ex) {
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(java.util.HashSet::new));
        if (studentIds.isEmpty()) return;

        java.util.Map<UUID, Long> counts = new java.util.HashMap<>(studentIds.size());
        for (Object[] row : enrollmentRepository.countDistinctActiveCoursesByStudentIds(studentIds)) {
            if (row == null || row.length < 2 || row[0] == null || row[1] == null) continue;
            counts.put((UUID) row[0], ((Number) row[1]).longValue());
        }

        for (UserResponse r : rows) {
            if (!"student".equalsIgnoreCase(r.getRole())) continue;
            try {
                UUID id = UUID.fromString(r.getId());
                r.setCoursesEnrolled(counts.getOrDefault(id, 0L).intValue());
            } catch (IllegalArgumentException ex) {
                // Leave default 0 if id is malformed.
            }
        }
    }

    // === Business Guard Helpers ===

    private boolean isOrgAdmin(UserJpaEntity user) {
        return user != null && user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private boolean isOrgAdminWithoutOrganization(UserJpaEntity user) {
        return isOrgAdmin(user) && user.getOrganizationId() == null;
    }

    private boolean isAdminRole(UserJpaEntity.UserRole role) {
        return role == UserJpaEntity.UserRole.ADMIN || role == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private boolean canAccessUser(UserJpaEntity currentUser, UserJpaEntity targetUser) {
        if (!isOrgAdmin(currentUser)) {
            return true;
        }
        UUID currentOrganizationId = currentUser.getOrganizationId();
        return currentOrganizationId != null && currentOrganizationId.equals(targetUser.getOrganizationId());
    }

    private boolean canManageUser(UserJpaEntity currentUser, UserJpaEntity targetUser) {
        return canAccessUser(currentUser, targetUser)
                && (!isOrgAdmin(currentUser) || !isAdminRole(targetUser.getRole()));
    }

    private Optional<UserJpaEntity> getAccessibleTargetUser(UUID userId, UserJpaEntity currentUser) {
        if (isOrgAdminWithoutOrganization(currentUser)) {
            return Optional.empty();
        }
        return userRepository.findById(userId)
                .filter(target -> canAccessUser(currentUser, target));
    }

    private Set<UserJpaEntity.UserRole> parseRoleFilter(String role, String roles) {
        Set<UserJpaEntity.UserRole> result = new LinkedHashSet<>();

        if (role != null && !role.isBlank()) {
            UserJpaEntity.UserRole parsed = parseRole(role);
            if (parsed == null) return null;
            result.add(parsed);
        }

        if (roles != null && !roles.isBlank()) {
            for (String item : roles.split(",")) {
                if (item == null || item.isBlank()) continue;
                UserJpaEntity.UserRole parsed = parseRole(item);
                if (parsed == null) return null;
                result.add(parsed);
            }
        }

        return result;
    }

    private String normalizeStatus(String rawStatus) {
        if (rawStatus == null || rawStatus.isBlank()) {
            return null;
        }

        String normalized = rawStatus.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "ACTIVE", "BLOCKED", "RESTRICTED" -> normalized;
            default -> null;
        };
    }

    private UserJpaEntity.UserRole parseRole(String rawRole) {
        if (rawRole == null || rawRole.isBlank()) {
            return null;
        }
        try {
            return UserJpaEntity.UserRole.valueOf(rawRole.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String validateUserProvisioningRequest(String email,
                                                   String fullName,
                                                   String password,
                                                   String username,
                                                   UserJpaEntity.UserRole targetRole,
                                                   UserJpaEntity currentUser) {
        if (isOrgAdminWithoutOrganization(currentUser)) {
            return "Chuyên viên quản lý phải thuộc một tổ chức để tạo người dùng";
        }
        if (targetRole == null) {
            return "Vai trò không hợp lệ";
        }
        if (isOrgAdmin(currentUser) && isAdminRole(targetRole)) {
            return "Chuyên viên quản lý không thể tạo tài khoản quản trị";
        }

        String normalizedEmail = email == null ? "" : email.trim();
        String normalizedFullName = fullName == null ? "" : fullName.trim();
        String normalizedUsername = username == null ? "" : username.trim();

        if (normalizedEmail.isBlank()) {
            return "Email không được để trống";
        }
        if (!isValidEmail(normalizedEmail)) {
            return "Email không hợp lệ";
        }
        if (normalizedEmail.length() > 100) {
            return "Email không được quá 100 ký tự";
        }
        if (normalizedFullName.isBlank()) {
            return "Họ tên không được để trống";
        }
        if (normalizedFullName.length() > 255) {
            return "Họ tên không được quá 255 ký tự";
        }
        if (normalizedUsername.isBlank()) {
            return "Tên đăng nhập không được để trống";
        }
        if (normalizedUsername.length() > 50) {
            return "Tên đăng nhập không được quá 50 ký tự";
        }
        if (userRepository.existsByEmail(normalizedEmail)) {
            return "Email đã tồn tại";
        }
        if (userRepository.existsByUsername(normalizedUsername)) {
            return "Tên đăng nhập đã tồn tại";
        }

        String passwordError = PasswordPolicy.validate(password);
        if (passwordError != null) {
            return passwordError;
        }
        return null;
    }

    private UserJpaEntity buildUserEntity(String username,
                                          String email,
                                          String password,
                                          String fullName,
                                          UserJpaEntity.UserRole targetRole,
                                          UserJpaEntity currentUser) {
        UserJpaEntity user = new UserJpaEntity(
                UUID.randomUUID(),
                username,
                email,
                passwordEncoder.encode(password),
                fullName,
                targetRole,
                true,
                Instant.now(),
                null
        );
        user.setMustChangePassword(true);
        if (isOrgAdmin(currentUser)) {
            user.setOrganizationId(currentUser.getOrganizationId());
        }
        return user;
    }

    private String resolveUsername(String username, String email) {
        if (username != null && !username.isBlank()) {
            return username.trim();
        }
        if (email == null || email.isBlank()) {
            return "";
        }
        int atIndex = email.indexOf('@');
        return (atIndex > 0 ? email.substring(0, atIndex) : email).trim();
    }

    private boolean isValidEmail(String email) {
        return email.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    }

    private boolean isExcelFile(MultipartFile file) {
        String filename = file.getOriginalFilename();
        if (filename == null) {
            return false;
        }
        String lowerName = filename.toLowerCase(Locale.ROOT);
        return lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");
    }

    private BulkImportColumnMapping resolveBulkImportColumns(Row headerRow) {
        if (headerRow == null) {
            return null;
        }

        DataFormatter formatter = new DataFormatter();
        Map<String, Integer> headers = new HashMap<>();
        int firstCell = headerRow.getFirstCellNum();
        if (firstCell < 0) {
            return null;
        }
        for (int columnIndex = firstCell; columnIndex < headerRow.getLastCellNum(); columnIndex++) {
            String header = normalizeHeader(formatter.formatCellValue(
                    headerRow.getCell(columnIndex, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL)
            ));
            if (!header.isBlank()) {
                headers.putIfAbsent(header, columnIndex);
            }
        }

        Integer emailColumn = findFirstHeader(headers, "email");
        Integer fullNameColumn = findFirstHeader(headers, "full name", "fullname", "name", "ho ten", "ten day du");
        if (emailColumn == null || fullNameColumn == null) {
            return null;
        }

        Integer usernameColumn = findFirstHeader(headers, "username", "ten dang nhap", "tai khoan");
        Integer passwordColumn = findFirstHeader(headers, "password", "mat khau");
        return new BulkImportColumnMapping(usernameColumn, emailColumn, fullNameColumn, passwordColumn);
    }

    private Integer findFirstHeader(Map<String, Integer> headers, String... aliases) {
        for (String alias : aliases) {
            Integer column = headers.get(normalizeHeader(alias));
            if (column != null) {
                return column;
            }
        }
        return null;
    }

    private String normalizeHeader(String rawValue) {
        if (rawValue == null) {
            return "";
        }
        String noAccent = Normalizer.normalize(rawValue, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return noAccent.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private String readCell(Row row, Integer columnIndex) {
        if (row == null || columnIndex == null) {
            return null;
        }
        DataFormatter formatter = new DataFormatter();
        return formatter.formatCellValue(
                row.getCell(columnIndex, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL)
        ).trim();
    }

    private boolean isBlankRow(Row row) {
        int firstCell = row.getFirstCellNum();
        if (firstCell < 0) {
            return true;
        }
        DataFormatter formatter = new DataFormatter();
        for (int columnIndex = firstCell; columnIndex < row.getLastCellNum(); columnIndex++) {
            String value = formatter.formatCellValue(
                    row.getCell(columnIndex, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL)
            );
            if (value != null && !value.isBlank()) {
                return false;
            }
        }
        return true;
    }

    private List<String> summarizeErrors(List<String> errors) {
        if (errors.size() <= 20) {
            return errors;
        }
        List<String> summarized = new ArrayList<>(errors.subList(0, 20));
        summarized.add("... và " + (errors.size() - 20) + " lỗi khác");
        return summarized;
    }

    private String firstMeaningfulMessage(Throwable throwable, String fallback) {
        Throwable current = throwable;
        while (current != null) {
            if (current.getMessage() != null && !current.getMessage().isBlank()) {
                return current.getMessage();
            }
            current = current.getCause();
        }
        return fallback;
    }

    private boolean isForbiddenProvisioningError(String message) {
        return message != null && message.startsWith("Chuyên viên quản lý");
    }

    private <T> ResponseEntity<ApiResponse<T>> badRequest(String message) {
        return ResponseEntity.badRequest().body(ApiResponse.error(message));
    }

    private <T> ResponseEntity<ApiResponse<T>> forbidden(String message) {
        return ResponseEntity.status(403).body(ApiResponse.error(message));
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
        /** Admin-managed status: ACTIVE, BLOCKED, RESTRICTED. Persisted since V118 (#73). */
        private String accountStatus;
        /** Operator note attached to BLOCKED/RESTRICTED transitions. Null when ACTIVE. */
        private String statusReason;
        private String statusUpdatedAt;
        private boolean mustChangePassword;
        private String createdAt;
        private String updatedAt;
        private String lastLogin;
        private int loginCount;
        private int coursesCreated;
        private int coursesEnrolled;
        /** Issue #229: organization scoping for multi-org admin management.
         *  null cho system ADMIN (không thuộc org nào) — FE hiển thị "Hệ thống". */
        private String organizationId;
        /** Issue #229: tên tổ chức tra cứu batch (avoid N+1) tại UserControllerV3.
         *  null đồng nghĩa với organizationId=null hoặc org đã bị xóa (orphan). */
        private String organizationName;
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
        @Size(min = 8, max = 128, message = "Mật khẩu phải có từ 8 đến 128 ký tự")
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

    public record BulkImportResult(
            int totalRows,
            int successfulImports,
            int failedImports,
            List<String> errors
    ) {}

    private record BulkImportColumnMapping(
            Integer usernameColumn,
            Integer emailColumn,
            Integer fullNameColumn,
            Integer passwordColumn
    ) {}
}
