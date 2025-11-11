# Hướng Dẫn Triển Khai Chức Năng Import Người Dùng Từ Excel

## Tổng Quan

Chức năng import người dùng từ Excel cho phép admin thêm nhiều người dùng cùng lúc thông qua file Excel. Hướng dẫn này sẽ hướng dẫn bạn triển khai từ đầu đến cuối.

## Mục Tiêu

- Admin có thể upload file Excel để import nhiều người dùng
- Chọn vai trò cho tất cả người dùng từ dropdown
- Hiển thị tiến trình import và kết quả
- Xử lý lỗi validation và hiển thị chi tiết

## Kiến Trúc Tổng Quan

```
Frontend (Angular)          Backend (Spring Boot)
├── user-management.component ├── UserController
├── admin.service            ├── UserBulkImportService
└── Modal UI                 └── Excel Processing
```

## Bước 1: Chuẩn Bị Backend

### 1.1 Thêm Dependencies

Trong `pom.xml`, đảm bảo có các dependencies sau:

```xml
<!-- Apache POI for Excel processing -->
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi</artifactId>
    <version>5.2.4</version>
</dependency>
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.2.4</version>
</dependency>

<!-- Spring Web Multipart for file upload -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

### 1.2 Tạo Entity User

```java
package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column
    private String department;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Column
    private String createdAt;

    @Column
    private String updatedAt;

    public enum Role {
        ADMIN, TEACHER, STUDENT
    }
}
```

### 1.3 Tạo Repository

```java
package com.example.lms.repository;

import com.example.lms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    Optional<User> findByUsername(String username);
}
```

### 1.4 Tạo Service Xử Lý Import

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

        // Getters and setters...
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
            user.setCreatedAt(new Date().toString());
            user.setUpdatedAt(new Date().toString());

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

### 1.5 Tạo Controller API

```java
package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.service.UserBulkImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserBulkImportService userBulkImportService;

    @PostMapping("/bulk-import")
    public ResponseEntity<ApiResponse<UserBulkImportService.BulkImportResult>> bulkImportUsers(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "defaultRole", defaultValue = "STUDENT") String defaultRole) {
        try {
            UserBulkImportService.BulkImportResult result = userBulkImportService.importUsersFromExcel(file, defaultRole);
            return ResponseEntity.ok(ApiResponse.success(result, "Import người dùng thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Lỗi khi import file: " + e.getMessage()));
        }
    }

    @GetMapping("/bulk-import/template")
    public ResponseEntity<ApiResponse<String>> getImportTemplate() {
        String template = userBulkImportService.generateExcelTemplate();
        return ResponseEntity.ok(ApiResponse.success(template, "Template hướng dẫn"));
    }
}
```

### 1.6 Tạo DTO Response

```java
package com.example.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private String timestamp;

    public static <T> ApiResponse<T> success(T data, String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setMessage(message);
        response.setData(data);
        response.setTimestamp(java.time.LocalDateTime.now().toString());
        return response;
    }

    public static <T> ApiResponse<T> error(String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(false);
        response.setMessage(message);
        response.setTimestamp(java.time.LocalDateTime.now().toString());
        return response;
    }
}
```

## Bước 2: Triển Khai Frontend

### 2.1 Cập Nhật Admin Service

```typescript
// admin.service.ts
export enum UserRole {
  ADMIN = "admin",
  TEACHER = "teacher",
  STUDENT = "student",
}

export interface BulkImportProgress {
  isImporting: boolean;
  progress: number;
  currentStep: string;
  result?: BulkImportResult;
}

export interface BulkImportResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: string[];
  importedUsers: AdminUser[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  // ... existing code ...

  // Bulk import signals
  private _bulkImportProgress = signal<BulkImportProgress>({
    isImporting: false,
    progress: 0,
    currentStep: ''
  });

  readonly bulkImportProgress = this._bulkImportProgress.asReadonly();

  async bulkImportUsers(file: File, defaultRole: UserRole = UserRole.STUDENT): Promise<BulkImportResult> {
    this._bulkImportProgress.set({
      isImporting: true,
      progress: 0,
      currentStep: 'Đang chuẩn bị file...'
    });

    try {
      // Validate file
      this.validateImportFile(file);

      this._bulkImportProgress.update(p => ({ ...p, progress: 20, currentStep: 'Đang upload file...' }));

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('defaultRole', defaultRole.toUpperCase());

      this._bulkImportProgress.update(p => ({ ...p, progress: 40, currentStep: 'Đang xử lý dữ liệu...' }));

      // Upload file
      const response = await this.http.post<any>(
        `${this.API_BASE_URL}${this.ENDPOINTS.users}/bulk-import`,
        formData
      ).toPromise();

      this._bulkImportProgress.update(p => ({ ...p, progress: 80, currentStep: 'Đang hoàn tất...' }));

      if (response?.data) {
        const result: BulkImportResult = {
          totalRows: response.data.totalRows,
          successfulImports: response.data.successfulImports,
          failedImports: response.data.failedImports,
          errors: response.data.errors || [],
          importedUsers: response.data.importedUsers?.map((user: any) => ({
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: user.role.toLowerCase(),
            avatar: this.getDefaultAvatar(user.email),
            department: this.getDepartmentFromRole(user.role.toLowerCase()),
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt || user.createdAt),
            isActive: user.enabled,
            lastLogin: new Date(),
            loginCount: 0,
            permissions: this.getDefaultPermissions(user.role.toLowerCase())
          })) || []
        };

        // Add imported users to local state
        this._users.update(users => [...users, ...result.importedUsers]);

        this._bulkImportProgress.set({
          isImporting: false,
          progress: 100,
          currentStep: 'Hoàn thành',
          result
        });

        this.errorService.showSuccess(
          `Import hoàn thành! ${result.successfulImports}/${result.totalRows} người dùng đã được thêm thành công.`,
          'bulk-import'
        );

        return result;
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error: any) {
      console.error('Bulk import failed:', error);

      this._bulkImportProgress.set({
        isImporting: false,
        progress: 0,
        currentStep: 'Lỗi khi import'
      });

      this.errorService.addError({
        message: error?.error?.message || 'Import thất bại. Vui lòng thử lại.',
        type: 'error',
        context: 'bulk-import'
      });

      throw error;
    }
  }

  private validateImportFile(file: File): void {
    // Check file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Chỉ chấp nhận file Excel (.xlsx hoặc .xls)');
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Kích thước file không được vượt quá 10MB');
    }

    // Check file name
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      throw new Error('Tên file phải có đuôi .xlsx hoặc .xls');
    }
  }

  resetBulkImportProgress(): void {
    this._bulkImportProgress.set({
      isImporting: false,
      progress: 0,
      currentStep: ''
    });
  }

  // ... rest of service ...
}
```

### 2.2 Cập Nhật Component User Management

```typescript
// user-management.component.ts
import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser, UserRole, PaginationInfo } from '../../infrastructure/services/admin.service';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- ... existing template ... -->

    <!-- Bulk Import Modal -->
    @if (isBulkImportModalOpen()) {
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Import người dùng từ Excel
                  </h3>

                  <!-- Template Info -->
                   <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                     <div class="flex">
                       <svg class="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                         <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                       </svg>
                       <div class="text-sm text-blue-700">
                         <p class="font-medium mb-1">Định dạng file Excel yêu cầu:</p>
                         <ul class="list-disc list-inside space-y-1 text-xs">
                           <li>Cột A: Username (bắt buộc) - Tên đăng nhập</li>
                           <li>Cột B: Email (bắt buộc) - Địa chỉ email</li>
                           <li>Cột C: Full Name (bắt buộc) - Họ tên đầy đủ</li>
                           <li>Cột D: Department (tùy chọn) - Phòng ban/Khoa</li>
                         </ul>
                         <button (click)="downloadTemplate()"
                                 class="mt-2 text-blue-600 hover:text-blue-800 underline text-xs">
                           Xem hướng dẫn chi tiết
                         </button>
                       </div>
                     </div>
                   </div>

                   <!-- Role Selection -->
                   <div class="mb-4">
                     <label class="block text-sm font-medium text-gray-700 mb-2">
                       Chọn vai trò cho tất cả người dùng được import
                     </label>
                     <select [(ngModel)]="defaultImportRole"
                             name="importRole"
                             class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                       <option [ngValue]="UserRole.STUDENT">Học viên</option>
                       <option [ngValue]="UserRole.TEACHER">Giảng viên</option>
                       <option [ngValue]="UserRole.ADMIN">Quản trị viên</option>
                     </select>
                     <p class="text-xs text-gray-500 mt-1">
                       Tất cả người dùng trong file Excel sẽ được gán vai trò này
                     </p>
                   </div>

                  <!-- File Upload -->
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">
                        Chọn file Excel (.xlsx hoặc .xls)
                      </label>
                      <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
                        @if (selectedFile()) {
                          <div class="text-center">
                            <svg class="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <div class="mt-4">
                              <p class="text-sm font-medium text-gray-900">{{ selectedFile()?.name }}</p>
                              <p class="text-xs text-gray-500">{{ formatFileSize(selectedFile()?.size || 0) }}</p>
                            </div>
                            <button (click)="removeFile()"
                                    class="mt-2 text-red-600 hover:text-red-800 text-sm underline">
                              Chọn file khác
                            </button>
                          </div>
                        } @else {
                          <div class="text-center">
                            <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                            <div class="mt-4">
                              <label for="file-upload" class="cursor-pointer">
                                <span class="mt-2 block text-sm font-medium text-gray-900">Kéo thả file vào đây hoặc</span>
                                <span class="mt-1 block text-sm text-blue-600 hover:text-blue-500">chọn file từ máy tính</span>
                              </label>
                              <input id="file-upload" name="file-upload" type="file" class="sr-only" accept=".xlsx,.xls" (change)="onFileSelected($event)">
                            </div>
                          </div>
                        }
                      </div>
                    </div>

                    <!-- Progress Bar -->
                    @if (adminService.bulkImportProgress().isImporting) {
                      <div class="space-y-2">
                        <div class="flex justify-between text-sm">
                          <span class="text-gray-600">{{ adminService.bulkImportProgress().currentStep }}</span>
                          <span class="text-gray-600">{{ adminService.bulkImportProgress().progress }}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                          <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                               [style.width.%]="adminService.bulkImportProgress().progress"></div>
                        </div>
                      </div>
                    }

                    <!-- Import Results -->
                    @if (adminService.bulkImportProgress().result) {
                      <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-medium text-gray-900 mb-2">Kết quả import:</h4>
                        <div class="grid grid-cols-3 gap-4 text-sm">
                          <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">{{ adminService.bulkImportProgress().result?.totalRows }}</div>
                            <div class="text-gray-600">Tổng dòng</div>
                          </div>
                          <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">{{ adminService.bulkImportProgress().result?.successfulImports }}</div>
                            <div class="text-gray-600">Thành công</div>
                          </div>
                          <div class="text-center">
                            <div class="text-2xl font-bold text-red-600">{{ adminService.bulkImportProgress().result?.failedImports }}</div>
                            <div class="text-gray-600">Thất bại</div>
                          </div>
                        </div>

                        @if (adminService.bulkImportProgress().result!.errors.length > 0) {
                           <div class="mt-4">
                             <h5 class="font-medium text-red-700 mb-2">Lỗi chi tiết:</h5>
                             <div class="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                               <ul class="text-xs text-red-700 space-y-1">
                                 @for (error of adminService.bulkImportProgress().result!.errors; track $index) {
                                   <li>• {{ error }}</li>
                                 }
                               </ul>
                             </div>
                           </div>
                         }
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button (click)="startBulkImport()"
                      [disabled]="!selectedFile() || adminService.bulkImportProgress().isImporting"
                      class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                @if (adminService.bulkImportProgress().isImporting) {
                  <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang import...
                } @else {
                  Import ngay
                }
              </button>
              <button (click)="closeBulkImportModal()"
                      [disabled]="adminService.bulkImportProgress().isImporting"
                      class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                @if (adminService.bulkImportProgress().result) {
                  Đóng
                } @else {
                  Hủy
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Default
})
export class UserManagementComponent implements OnInit {
  protected adminService = inject(AdminService);

  // Make UserRole available in template
  UserRole = UserRole;

  // ... existing properties ...

  // Bulk import modal state
  isBulkImportModalOpen = signal(false);
  selectedFile = signal<File | null>(null);
  importTemplate = signal<string>('');
  defaultImportRole = signal<UserRole>(UserRole.STUDENT);

  // ... existing methods ...

  // Bulk import methods
  async openBulkImportModal(): Promise<void> {
    this.isBulkImportModalOpen.set(true);
    this.selectedFile.set(null);
    this.adminService.resetBulkImportProgress();

    // Load import template
    try {
      const template = await this.adminService.getImportTemplate();
      this.importTemplate.set(template);
    } catch (error) {
      console.error('Failed to load import template:', error);
    }
  }

  closeBulkImportModal(): void {
    this.isBulkImportModalOpen.set(false);
    this.selectedFile.set(null);
    this.adminService.resetBulkImportProgress();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  removeFile(): void {
    this.selectedFile.set(null);
  }

  async downloadTemplate(): Promise<void> {
    alert(`Template Excel đơn giản chỉ cần 4 cột:\n\n` +
          `1. Username (bắt buộc) - Tên đăng nhập\n` +
          `2. Email (bắt buộc) - Địa chỉ email\n` +
          `3. Full Name (bắt buộc) - Họ tên đầy đủ\n` +
          `4. Department (tùy chọn) - Phòng ban/Khoa\n\n` +
          `Ví dụ:\n` +
          `nguyenvana, nguyenvana@student.edu.vn, Nguyễn Văn A, Khoa CNTT\n` +
          `tranthib, tranthib@student.edu.vn, Trần Thị B, Khoa CNTT\n\n` +
          `Tất cả người dùng sẽ được gán vai trò đã chọn ở trên.`);
  }

  async startBulkImport(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    try {
      await this.adminService.bulkImportUsers(file, this.defaultImportRole());
      // Refresh user list after successful import
      await this.loadUsers(1);
    } catch (error) {
      console.error('Bulk import failed:', error);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
```

## Bước 3: Cấu Hình Database

### 3.1 Tạo Migration Script

```sql
-- V7__add_department_to_users.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

## Bước 4: Testing và Validation

### 4.1 Tạo File Excel Test

Tạo file `test_users.xlsx` với nội dung:

| Username    | Email                     | Full Name      | Department   |
|-------------|---------------------------|----------------|--------------|
| testuser1   | test1@student.edu.vn      | Nguyễn Văn A   | Khoa CNTT    |
| testuser2   | test2@student.edu.vn      | Trần Thị B     | Khoa Toán    |
| testuser3   | test3@teacher.edu.vn      | Lê Văn C       | Khoa Lý      |

### 4.2 Test Cases

1. **Import thành công**: File Excel đúng định dạng
2. **Validation errors**: Email trùng, username trùng, định dạng sai
3. **File errors**: Sai định dạng file, quá kích thước
4. **Role assignment**: Đúng vai trò được gán cho tất cả users

### 4.3 API Testing với Postman

```bash
POST /api/v1/users/bulk-import
Content-Type: multipart/form-data

Form Data:
- file: [Chọn file Excel]
- defaultRole: STUDENT
```

## Bước 5: Xử Lý Lỗi Thường Gặp

### 5.1 Lỗi "Port already in use"

```bash
# Tìm process sử dụng port 8090
netstat -ano | findstr :8090

# Kill process
taskkill /PID <PID> /F
```

### 5.2 Lỗi "Column index out of range"

- **Nguyên nhân**: File Excel có ít cột hơn expected
- **Giải pháp**: Đảm bảo file có đủ 4 cột theo thứ tự

### 5.3 Lỗi "Username already exists"

- **Nguyên nhân**: Username đã tồn tại trong database
- **Giải pháp**: Kiểm tra và đổi username khác

### 5.4 Lỗi TypeScript

- **Nguyên nhân**: Signals có thể undefined
- **Giải pháp**: Sử dụng non-null assertion operator (`!`)

## Bước 6: Tối Ưu Hóa

### 6.1 Performance

- Sử dụng batch insert cho nhiều users
- Validate song song thay vì tuần tự
- Giới hạn file size và số lượng rows

### 6.2 Security

- Validate file type và content
- Sanitize input data
- Rate limiting cho API

### 6.3 UX Improvements

- Drag & drop file upload
- Real-time progress updates
- Download error report

## Checklist Triển Khai

- [ ] Backend dependencies đã thêm
- [ ] Entity User đã tạo
- [ ] Repository đã implement
- [ ] Service xử lý Excel đã viết
- [ ] Controller API đã tạo
- [ ] DTO Response đã tạo
- [ ] Frontend service đã cập nhật
- [ ] Component UI đã implement
- [ ] Database migration đã chạy
- [ ] Testing đã pass
- [ ] Documentation đã viết

## Kết Luận

Chức năng import người dùng từ Excel bao gồm:

1. **Backend**: Xử lý file Excel, validation, lưu database
2. **Frontend**: UI upload, chọn role, hiển thị progress và kết quả
3. **Database**: Lưu trữ users với đầy đủ thông tin
4. **Security**: Validation input, error handling
5. **UX**: Progress tracking, error reporting

Bạn có thể follow guide này để triển khai chức năng tương tự trong dự án khác!