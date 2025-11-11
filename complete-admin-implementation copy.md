# 🎯 Complete Admin Implementation - All Files & Code

## 📋 Tổng Quan

Tài liệu này chứa toàn bộ code của tất cả files cần thiết để tạo nên chức năng Admin hoàn chỉnh, bao gồm cả backend và frontend với việc kết nối thực tế.

## 🗄️ Database Schema (Các bảng liên quan đến Admin)

### 1. users (Bảng người dùng chính)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT')),
    department VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 2. courses (Bảng khóa học)
```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 3. course_enrollments (Bảng đăng ký khóa học)
```sql
CREATE TABLE course_enrollments (
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (course_id, student_id)
);
```

### 4. sections (Bảng chương học)
```sql
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 5. lessons (Bảng bài học)
```sql
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    video_url VARCHAR(500),
    duration_minutes INTEGER DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 6. assignments (Bảng bài tập)
```sql
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    due_date TIMESTAMP,
    max_score DECIMAL(5,2) DEFAULT 100.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 7. submissions (Bảng nộp bài)
```sql
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    file_url VARCHAR(500),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score DECIMAL(5,2),
    feedback TEXT,
    graded_at TIMESTAMP,
    graded_by UUID REFERENCES users(id),
    UNIQUE(assignment_id, student_id)
);
```

### 8. assignment_submissions (Bảng nộp bài tập)
```sql
CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    student_id UUID NOT NULL,
    content TEXT,
    attachment_url VARCHAR(500),
    score DECIMAL(5,2),
    feedback TEXT,
    submitted_at TIMESTAMP,
    graded_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_assignment_submissions_assignment
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_submissions_student
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_assignment_student
        UNIQUE (assignment_id, student_id)
);
```

### 9. password_reset_tokens (Bảng token đặt lại mật khẩu)
```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,
    email VARCHAR(100) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure only one active OTP per user
    CONSTRAINT unique_active_otp_per_user UNIQUE (user_id, used)
);
```

## 🗄️ Backend Implementation

### 1. UserController.java (Admin User Management)

```java
package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.User;
import com.example.lms.service.UserBulkImportService;
import com.example.lms.service.UserService;
import java.util.List;
import java.util.stream.Collectors;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "API quản lý người dùng (Admin only)")
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "Bearer Authentication")
public class UserController {

    private final UserService userService;
    private final UserBulkImportService userBulkImportService;

    @GetMapping
    @Operation(summary = "Lấy danh sách người dùng", description = "Admin lấy danh sách tất cả người dùng với phân trang")
    public ResponseEntity<ApiResponse<List<UserSummary>>> getAllUsers(
            @Parameter(description = "Số trang (bắt đầu từ 1)") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "Số lượng item trên mỗi trang") @RequestParam(defaultValue = "10") int limit,
            @Parameter(description = "Tìm kiếm theo tên hoặc email") @RequestParam(required = false) String search
    ) {
        try {
            Pageable pageable = PageRequest.of(page - 1, limit);
            Page<User> users = userService.getAllUsers(pageable, search);

            List<UserSummary> userSummaries = users.getContent().stream()
                    .map(user -> UserSummary.builder()
                            .id(user.getId())
                            .username(user.getUsername())
                            .email(user.getEmail())
                            .fullName(user.getFullName())
                            .role(user.getRole().name())
                            .enabled(user.getEnabled())
                            .createdAt(user.getCreatedAt())
                            .updatedAt(user.getUpdatedAt())
                            .build())
                    .collect(Collectors.toList());

            // Create pagination info matching frontend expectations
            ApiResponse.PaginationInfo paginationInfo = new ApiResponse.PaginationInfo();
            paginationInfo.setTotalItems((int) users.getTotalElements());
            paginationInfo.setTotalPages(users.getTotalPages());
            paginationInfo.setPage(page);
            paginationInfo.setLimit(limit);
            paginationInfo.setFirst(users.isFirst());
            paginationInfo.setLast(users.isLast());

            ApiResponse<List<UserSummary>> response = new ApiResponse<>();
            response.setSuccess(true);
            response.setMessage("Users retrieved successfully");
            response.setData(userSummaries);
            response.setPagination(paginationInfo);
            response.setTimestamp(java.time.LocalDateTime.now().toString());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy danh sách người dùng: " + e.getMessage()));
        }
    }

    @PostMapping
    @Operation(summary = "Tạo người dùng mới", description = "Admin tạo tài khoản người dùng mới")
    public ResponseEntity<ApiResponse<UserDetail>> createUser(@Valid @RequestBody CreateUserRequest request) {
        try {
            User newUser = userService.createUser(request);

            UserDetail userDetail = UserDetail.builder()
                    .id(newUser.getId())
                    .username(newUser.getUsername())
                    .email(newUser.getEmail())
                    .fullName(newUser.getFullName())
                    .role(newUser.getRole().name())
                    .enabled(newUser.getEnabled())
                    .createdAt(newUser.getCreatedAt())
                    .updatedAt(newUser.getUpdatedAt())
                    .build();

            ApiResponse<UserDetail> response = new ApiResponse<>();
            response.setSuccess(true);
            response.setMessage("User created successfully");
            response.setData(userDetail);
            response.setTimestamp(java.time.LocalDateTime.now().toString());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/list/all")
    @Operation(summary = "Lấy tất cả người dùng", description = "Admin lấy danh sách tất cả người dùng không phân trang (dành cho dropdown, etc.)")
    // @PreAuthorize("hasRole('ADMIN')") // Temporarily disabled for testing
    public ResponseEntity<ApiResponse<List<UserSummary>>> getAllUsers() {
        try {
            List<User> users = userService.getAllUsers();

            List<UserSummary> userSummaries = users.stream()
                    .map(user -> UserSummary.builder()
                            .id(user.getId())
                            .username(user.getUsername())
                            .email(user.getEmail())
                            .fullName(user.getFullName())
                            .role(user.getRole().name())
                            .enabled(user.getEnabled())
                            .createdAt(user.getCreatedAt())
                            .updatedAt(user.getUpdatedAt())
                            .build())
                    .collect(Collectors.toList());

            ApiResponse<List<UserSummary>> response = new ApiResponse<>();
            response.setSuccess(true);
            response.setMessage("All users retrieved successfully");
            response.setData(userSummaries);
            response.setTimestamp(java.time.LocalDateTime.now().toString());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy danh sách tất cả người dùng: " + e.getMessage()));
        }
    }

    @GetMapping("/{userId}")
    @Operation(summary = "Lấy thông tin chi tiết người dùng", description = "Admin lấy thông tin của một người dùng cụ thể")
    public ResponseEntity<ApiResponse<UserDetail>> getUserById(@PathVariable UUID userId) {
        try {
            User user = userService.getUserById(userId);

            UserDetail userDetail = UserDetail.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .role(user.getRole().name())
                    .enabled(user.getEnabled())
                    .createdAt(user.getCreatedAt())
                    .updatedAt(user.getUpdatedAt())
                    .build();

            return ResponseEntity.ok(ApiResponse.success(userDetail));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Không tìm thấy người dùng"));
        }
    }

    @PutMapping("/{userId}")
    @Operation(summary = "Cập nhật thông tin người dùng", description = "Admin cập nhật thông tin của một người dùng")
    public ResponseEntity<ApiResponse<UserDetail>> updateUser(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        try {
            User updatedUser = userService.updateUser(userId, request);

            UserDetail userDetail = UserDetail.builder()
                    .id(updatedUser.getId())
                    .username(updatedUser.getUsername())
                    .email(updatedUser.getEmail())
                    .fullName(updatedUser.getFullName())
                    .role(updatedUser.getRole().name())
                    .enabled(updatedUser.getEnabled())
                    .createdAt(updatedUser.getCreatedAt())
                    .updatedAt(updatedUser.getUpdatedAt())
                    .build();

            ApiResponse<UserDetail> response = new ApiResponse<>();
            response.setSuccess(true);
            response.setMessage("User updated successfully");
            response.setData(userDetail);
            response.setTimestamp(java.time.LocalDateTime.now().toString());

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{userId}")
    @Operation(summary = "Vô hiệu hóa người dùng", description = "Admin vô hiệu hóa tài khoản người dùng")
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable UUID userId) {
        try {
            userService.disableUser(userId);

            ApiResponse<String> response = new ApiResponse<>();
            response.setSuccess(true);
            response.setMessage("User deleted successfully");
            response.setTimestamp(java.time.LocalDateTime.now().toString());

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/bulk-import")
    @Operation(summary = "Import người dùng từ Excel", description = "Admin upload file Excel để import nhiều người dùng cùng lúc")
    public ResponseEntity<ApiResponse<UserBulkImportService.BulkImportResult>> bulkImportUsers(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "defaultRole", defaultValue = "STUDENT") String defaultRole) {
        try {
            UserBulkImportService.BulkImportResult result = userBulkImportService.importUsersFromExcel(file, defaultRole);

            ApiResponse<UserBulkImportService.BulkImportResult> response = new ApiResponse<>();
            response.setSuccess(true);
            response.setMessage("Bulk import completed");
            response.setData(result);
            response.setTimestamp(java.time.LocalDateTime.now().toString());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Lỗi khi import file: " + e.getMessage()));
        }
    }

    @GetMapping("/bulk-import/template")
    @Operation(summary = "Lấy template hướng dẫn import", description = "Lấy hướng dẫn định dạng file Excel để import người dùng")
    public ResponseEntity<ApiResponse<String>> getImportTemplate() {
        String template = userBulkImportService.generateExcelTemplate();

        ApiResponse<String> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setMessage("Import template retrieved");
        response.setData(template);
        response.setTimestamp(java.time.LocalDateTime.now().toString());

        return ResponseEntity.ok(response);
    }

    // DTOs
    public static class UserSummary {
        private UUID id;
        private String username;
        private String email;
        private String fullName;
        private String role;
        private Boolean enabled;
        private java.time.Instant createdAt;
        private java.time.Instant updatedAt;

        public static UserSummaryBuilder builder() {
            return new UserSummaryBuilder();
        }

        public static class UserSummaryBuilder {
            private UUID id;
            private String username;
            private String email;
            private String fullName;
            private String role;
            private Boolean enabled;
            private java.time.Instant createdAt;
            private java.time.Instant updatedAt;

            public UserSummaryBuilder id(UUID id) { this.id = id; return this; }
            public UserSummaryBuilder username(String username) { this.username = username; return this; }
            public UserSummaryBuilder email(String email) { this.email = email; return this; }
            public UserSummaryBuilder fullName(String fullName) { this.fullName = fullName; return this; }
            public UserSummaryBuilder role(String role) { this.role = role; return this; }
            public UserSummaryBuilder enabled(Boolean enabled) { this.enabled = enabled; return this; }
            public UserSummaryBuilder createdAt(java.time.Instant createdAt) { this.createdAt = createdAt; return this; }
            public UserSummaryBuilder updatedAt(java.time.Instant updatedAt) { this.updatedAt = updatedAt; return this; }

            public UserSummary build() {
                UserSummary user = new UserSummary();
                user.id = this.id;
                user.username = this.username;
                user.email = this.email;
                user.fullName = this.fullName;
                user.role = this.role;
                user.enabled = this.enabled;
                user.createdAt = this.createdAt;
                user.updatedAt = this.updatedAt;
                return user;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getUsername() { return username; }
        public String getEmail() { return email; }
        public String getFullName() { return fullName; }
        public String getRole() { return role; }
        public Boolean getEnabled() { return enabled; }
        public java.time.Instant getCreatedAt() { return createdAt; }
        public java.time.Instant getUpdatedAt() { return updatedAt; }
    }

    public static class UserDetail {
        private UUID id;
        private String username;
        private String email;
        private String fullName;
        private String role;
        private Boolean enabled;
        private java.time.Instant createdAt;
        private java.time.Instant updatedAt;

        public static UserDetailBuilder builder() {
            return new UserDetailBuilder();
        }

        public static class UserDetailBuilder {
            private UUID id;
            private String username;
            private String email;
            private String fullName;
            private String role;
            private Boolean enabled;
            private java.time.Instant createdAt;
            private java.time.Instant updatedAt;

            public UserDetailBuilder id(UUID id) { this.id = id; return this; }
            public UserDetailBuilder username(String username) { this.username = username; return this; }
            public UserDetailBuilder email(String email) { this.email = email; return this; }
            public UserDetailBuilder fullName(String fullName) { this.fullName = fullName; return this; }
            public UserDetailBuilder role(String role) { this.role = role; return this; }
            public UserDetailBuilder enabled(Boolean enabled) { this.enabled = enabled; return this; }
            public UserDetailBuilder createdAt(java.time.Instant createdAt) { this.createdAt = createdAt; return this; }
            public UserDetailBuilder updatedAt(java.time.Instant updatedAt) { this.updatedAt = updatedAt; return this; }

            public UserDetail build() {
                UserDetail user = new UserDetail();
                user.id = this.id;
                user.username = this.username;
                user.email = this.email;
                user.fullName = this.fullName;
                user.role = this.role;
                user.enabled = this.enabled;
                user.createdAt = this.createdAt;
                user.updatedAt = this.updatedAt;
                return user;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getUsername() { return username; }
        public String getEmail() { return email; }
        public String getFullName() { return fullName; }
        public String getRole() { return role; }
        public Boolean getEnabled() { return enabled; }
        public java.time.Instant getCreatedAt() { return createdAt; }
        public java.time.Instant getUpdatedAt() { return updatedAt; }
    }

    public static class CreateUserRequest {
        @NotBlank(message = "Tên đăng nhập không được để trống")
        @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3-50 ký tự")
        private String username;

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        private String email;

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
        private String password;

        @Size(max = 100, message = "Họ tên không được vượt quá 100 ký tự")
        private String fullName;

        @NotBlank(message = "Vai trò không được để trống")
        private String role;

        // Getters and Setters
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }

    public static class UpdateUserRequest {
        @Email(message = "Email không đúng định dạng")
        private String email;

        @Size(max = 100, message = "Họ tên không được vượt quá 100 ký tự")
        private String fullName;

        private String role;

        private Boolean enabled;

        // Getters and Setters
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public Boolean getEnabled() { return enabled; }
        public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    }
}
```

### 2. UserService.java (Backend Service)

```java
package com.example.lms.service;

import com.example.lms.entity.User;
import com.example.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy user với username: " + username));
    }

    public User createUser(User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Username đã tồn tại: " + user.getUsername());
        }

        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email đã tồn tại: " + user.getEmail());
        }

        // Encrypt password
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        return userRepository.save(user);
    }

    public Optional<User> findById(UUID id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public List<User> findByRole(User.Role role) {
        return userRepository.findByRole(role);
    }

    public List<User> findAllActive() {
        return userRepository.findAllActive();
    }

    public List<User> searchUsers(String keyword) {
        return userRepository.searchUsers(keyword);
    }

    public User updateUser(User user) {
        if (!userRepository.existsById(user.getId())) {
            throw new RuntimeException("Không tìm thấy user với ID: " + user.getId());
        }
        return userRepository.save(user);
    }

    public void deleteUser(UUID userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("Không tìm thấy user với ID: " + userId);
        }
        userRepository.deleteById(userId);
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    public long countByRole(User.Role role) {
        return userRepository.countByRole(role);
    }

    public void changePassword(UUID userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Mật khẩu cũ không đúng");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void enableUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        user.setEnabled(true);
        userRepository.save(user);
    }

    public void disableUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        user.setEnabled(false);
        userRepository.save(user);
    }

    // Additional methods for UserController
    public org.springframework.data.domain.Page<User> getAllUsers(org.springframework.data.domain.Pageable pageable, String search) {
        if (search != null && !search.trim().isEmpty()) {
            return userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(
                search.trim(), search.trim(), search.trim(), pageable);
        }
        return userRepository.findAll(pageable);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User createUser(com.example.lms.controller.UserController.CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username đã tồn tại: " + request.getUsername());
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại: " + request.getEmail());
        }

        User.Role role;
        try {
            role = User.Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Vai trò không hợp lệ: " + request.getRole());
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(role)
                .enabled(true)
                .build();

        return userRepository.save(user);
    }

    public User getUserById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user với ID: " + userId));
    }

    public User updateUser(UUID userId, com.example.lms.controller.UserController.UpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user với ID: " + userId));

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email đã được sử dụng bởi tài khoản khác");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }

        if (request.getRole() != null) {
            try {
                User.Role role = User.Role.valueOf(request.getRole().toUpperCase());
                user.setRole(role);
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Vai trò không hợp lệ: " + request.getRole());
            }
        }

        if (request.getEnabled() != null) {
            user.setEnabled(request.getEnabled());
        }

        return userRepository.save(user);
    }

    public boolean checkPassword(User user, String password) {
        return passwordEncoder.matches(password, user.getPassword());
    }

    public void changePassword(User user, String newPassword) {
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void updatePassword(User user, String newPassword) {
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
```

### 3. UserBulkImportService.java (Excel Import Service)

```java
package com.example.lms.service;

import com.example.lms.entity.User;
import com.example.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserBulkImportService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public static class BulkImportResult {
        private int totalRows;
        private int successfulImports;
        private int failedImports;
        private List<String> errors;
        private List<User> importedUsers;

        public BulkImportResult() {
            this.errors = new ArrayList<>();
            this.importedUsers = new ArrayList<>();
        }

        // Getters and setters
        public int getTotalRows() { return totalRows; }
        public void setTotalRows(int totalRows) { this.totalRows = totalRows; }
        public int getSuccessfulImports() { return successfulImports; }
        public void setSuccessfulImports(int successfulImports) { this.successfulImports = successfulImports; }
        public int getFailedImports() { return failedImports; }
        public void setFailedImports(int failedImports) { this.failedImports = failedImports; }
        public List<String> getErrors() { return errors; }
        public void setErrors(List<String> errors) { this.errors = errors; }
        public List<User> getImportedUsers() { return importedUsers; }
        public void setImportedUsers(List<User> importedUsers) { this.importedUsers = importedUsers; }

        public void addError(String error) {
            this.errors.add(error);
            this.failedImports++;
        }

        public void addSuccess(User user) {
            this.importedUsers.add(user);
            this.successfulImports++;
        }
    }

    public BulkImportResult importUsersFromExcel(MultipartFile file, String defaultRole) throws IOException {
        BulkImportResult result = new BulkImportResult();

        // Validate file
        validateExcelFile(file);

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new IllegalArgumentException("File Excel không có sheet nào");
            }

            result.setTotalRows(sheet.getPhysicalNumberOfRows() - 1); // Exclude header row

            // Process rows starting from row 1 (skip header)
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                try {
                    User user = parseUserFromRow(row, i + 1, defaultRole);
                    validateUserForImport(user, i + 1);

                    // Save user
                    user.setPassword(passwordEncoder.encode(user.getPassword()));
                    User savedUser = userRepository.save(user);

                    result.addSuccess(savedUser);
                    log.info("Successfully imported user: {} at row {}", user.getUsername(), i + 1);

                } catch (Exception e) {
                    String errorMsg = String.format("Lỗi ở dòng %d: %s", i + 1, e.getMessage());
                    result.addError(errorMsg);
                    log.warn("Failed to import user at row {}: {}", i + 1, e.getMessage());
                }
            }

        } catch (Exception e) {
            log.error("Error processing Excel file: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi khi xử lý file Excel: " + e.getMessage());
        }

        return result;
    }

    private void validateExcelFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File không được để trống");
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null || (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls"))) {
            throw new IllegalArgumentException("Chỉ chấp nhận file Excel (.xlsx hoặc .xls)");
        }

        // Check file size (max 10MB)
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new IllegalArgumentException("Kích thước file không được vượt quá 10MB");
        }
    }

    private User parseUserFromRow(Row row, int rowNumber, String defaultRole) {
        User user = new User();

        try {
            // Column 0: Username (required)
            Cell usernameCell = row.getCell(0);
            if (usernameCell == null || usernameCell.getCellType() == CellType.BLANK) {
                throw new IllegalArgumentException("Thiếu tên đăng nhập");
            }
            String username = getCellValueAsString(usernameCell).trim();
            if (username.isEmpty()) {
                throw new IllegalArgumentException("Tên đăng nhập không được để trống");
            }
            user.setUsername(username.toLowerCase().replaceAll("\\s+", ""));

            // Column 1: Email (required)
            Cell emailCell = row.getCell(1);
            if (emailCell == null || emailCell.getCellType() == CellType.BLANK) {
                throw new IllegalArgumentException("Thiếu email");
            }
            String email = getCellValueAsString(emailCell).trim();
            if (email.isEmpty()) {
                throw new IllegalArgumentException("Email không được để trống");
            }
            user.setEmail(email.toLowerCase());

            // Column 2: Full Name (required)
            Cell fullNameCell = row.getCell(2);
            if (fullNameCell == null || fullNameCell.getCellType() == CellType.BLANK) {
                throw new IllegalArgumentException("Thiếu họ tên");
            }
            String fullName = getCellValueAsString(fullNameCell).trim();
            if (fullName.isEmpty()) {
                throw new IllegalArgumentException("Họ tên không được để trống");
            }
            user.setFullName(fullName);

            // Use default role from parameter
            try {
                user.setRole(User.Role.valueOf(defaultRole));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Vai trò không hợp lệ: " + defaultRole + ". Chỉ chấp nhận: ADMIN, TEACHER, STUDENT");
            }

            // Column 3: Department (optional)
            Cell departmentCell = row.getCell(3);
            if (departmentCell != null && departmentCell.getCellType() != CellType.BLANK) {
                user.setDepartment(getCellValueAsString(departmentCell).trim());
            }

            // Set default password (user should change later)
            user.setPassword("123456");
            user.setEnabled(true);
            user.setCreatedAt(java.time.Instant.now());
            user.setUpdatedAt(java.time.Instant.now());

        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi đọc dữ liệu: " + e.getMessage());
        }

        return user;
    }

    private void validateUserForImport(User user, int rowNumber) {
        // Check username uniqueness
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new IllegalArgumentException("Tên đăng nhập đã tồn tại: " + user.getUsername());
        }

        // Check email uniqueness
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new IllegalArgumentException("Email đã tồn tại: " + user.getEmail());
        }

        // Validate username format
        if (!user.getUsername().matches("^[a-zA-Z0-9_-]+$")) {
            throw new IllegalArgumentException("Tên đăng nhập chỉ được chứa chữ cái, số, gạch dưới và gạch ngang");
        }

        // Validate email format
        if (!user.getEmail().matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            throw new IllegalArgumentException("Định dạng email không hợp lệ");
        }

        // Validate full name length
        if (user.getFullName().length() > 100) {
            throw new IllegalArgumentException("Họ tên không được vượt quá 100 ký tự");
        }
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                } else {
                    double numericValue = cell.getNumericCellValue();
                    if (numericValue == (long) numericValue) {
                        return String.valueOf((long) numericValue);
                    } else {
                        return String.valueOf(numericValue);
                    }
                }
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    try {
                        return String.valueOf(cell.getNumericCellValue());
                    } catch (Exception ex) {
                        return "";
                    }
                }
            case BLANK:
            default:
                return "";
        }
    }

    public String generateExcelTemplate() {
        return "Template Excel đơn giản chỉ cần 4 cột theo thứ tự:\n" +
                "1. Username (bắt buộc) - Tên đăng nhập\n" +
                "2. Email (bắt buộc) - Địa chỉ email\n" +
                "3. Full Name (bắt buộc) - Họ tên đầy đủ\n" +
                "4. Department (tùy chọn) - Phòng ban/Khoa\n\n" +
                "Ví dụ:\n" +
                "nguyenvana, nguyenvana@student.edu.vn, Nguyễn Văn A, Khoa CNTT\n" +
                "tranthib, tranthib@student.edu.vn, Trần Thị B, Khoa CNTT\n\n" +
                "Lưu ý: Tất cả người dùng sẽ được gán vai trò đã chọn trong form import.";
    }
}
```

### 4. AdminController.java

```java
package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.Course;
import com.example.lms.entity.User;
import com.example.lms.service.AdminService;
import com.example.lms.repository.SectionRepository;
import com.example.lms.repository.AssignmentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Administration", description = "API quản trị hệ thống (Admin only)")
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "Bearer Authentication")
public class AdminController {

    private final AdminService adminService;
    private final SectionRepository sectionRepository;
    private final AssignmentRepository assignmentRepository;

    @GetMapping("/courses/pending")
    @Operation(summary = "Lấy danh sách khóa học chờ duyệt", description = "Admin lấy tất cả khóa học đang chờ duyệt")
    public ResponseEntity<ApiResponse<Page<PendingCourseSummary>>> getPendingCourses(
            @Parameter(description = "Số trang (bắt đầu từ 1)") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "Số lượng item trên mỗi trang") @RequestParam(defaultValue = "10") int limit
    ) {
        try {
            Pageable pageable = PageRequest.of(page - 1, limit);
            Page<Course> courses = adminService.getPendingCourses(pageable);

            Page<PendingCourseSummary> courseSummaries = courses.map(this::convertToPendingCourseSummary);

            return ResponseEntity.ok(ApiResponse.success(courseSummaries));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy danh sách khóa học chờ duyệt: " + e.getMessage()));
        }
    }

    @PatchMapping("/courses/{courseId}/approve")
    @Operation(summary = "Duyệt khóa học", description = "Admin duyệt một khóa học")
    public ResponseEntity<ApiResponse<String>> approveCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            adminService.approveCourse(courseId, currentUser);
            return ResponseEntity.ok(ApiResponse.success("Khóa học đã được duyệt"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PatchMapping("/courses/{courseId}/reject")
    @Operation(summary = "Từ chối khóa học", description = "Admin từ chối một khóa học kèm lý do")
    public ResponseEntity<ApiResponse<String>> rejectCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody RejectCourseRequest request
    ) {
        try {
            adminService.rejectCourse(courseId, currentUser, request);
            return ResponseEntity.ok(ApiResponse.success("Khóa học đã bị từ chối"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/analytics")
    @Operation(summary = "Lấy dữ liệu phân tích hệ thống", description = "Admin lấy thống kê tổng quan toàn hệ thống")
    public ResponseEntity<ApiResponse<SystemAnalytics>> getSystemAnalytics() {
        try {
            Map<String, Object> analyticsData = adminService.getSystemAnalytics();
            SystemAnalytics analytics = SystemAnalytics.fromMap(analyticsData);
            return ResponseEntity.ok(ApiResponse.success(analytics));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy dữ liệu phân tích: " + e.getMessage()));
        }
    }

    @GetMapping("/courses/all")
    @Operation(summary = "Lấy tất cả khóa học", description = "Admin lấy danh sách tất cả khóa học trong hệ thống")
    public ResponseEntity<ApiResponse<Page<AdminCourseSummary>>> getAllCourses(
            @Parameter(description = "Số trang (bắt đầu từ 1)") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "Số lượng item trên mỗi trang") @RequestParam(defaultValue = "10") int limit,
            @Parameter(description = "Lọc theo trạng thái") @RequestParam(required = false) String status,
            @Parameter(description = "Tìm kiếm theo tên khóa học") @RequestParam(required = false) String search
    ) {
        try {
            Pageable pageable = PageRequest.of(page - 1, limit);
            Page<Course> courses = adminService.getAllCourses(search,
                status != null ? Course.CourseStatus.valueOf(status.toUpperCase()) : null,
                pageable);

            Page<AdminCourseSummary> courseSummaries = courses.map(this::convertToAdminCourseSummary);

            return ResponseEntity.ok(ApiResponse.success(courseSummaries));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy danh sách khóa học: " + e.getMessage()));
        }
    }

    // Helper methods
    private PendingCourseSummary convertToPendingCourseSummary(Course course) {
        return PendingCourseSummary.builder()
                .id(course.getId())
                .code(course.getCode())
                .title(course.getTitle())
                .description(course.getDescription())
                .teacherId(course.getTeacher().getId())
                .teacherName(course.getTeacher().getFullName())
                .teacherEmail(course.getTeacher().getEmail())
                .sectionsCount(Math.toIntExact(sectionRepository.countByCourseId(course.getId())))
                .submittedAt(course.getUpdatedAt() != null ? course.getUpdatedAt() : course.getCreatedAt())
                .createdAt(course.getCreatedAt())
                .build();
    }

    private AdminCourseSummary convertToAdminCourseSummary(Course course) {
        return AdminCourseSummary.builder()
                .id(course.getId())
                .code(course.getCode())
                .title(course.getTitle())
                .status(course.getStatus().name())
                .teacherName(course.getTeacher().getFullName())
                .enrolledCount(0) // TODO: Add count query for enrolled students
                .sectionsCount(Math.toIntExact(sectionRepository.countByCourseId(course.getId())))
                .assignmentsCount(Math.toIntExact(assignmentRepository.countByCourseId(course.getId())))
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .build();
    }

    // DTOs
    public static class PendingCourseSummary {
        private UUID id;
        private String code;
        private String title;
        private String description;
        private UUID teacher