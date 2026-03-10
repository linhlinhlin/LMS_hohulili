package com.example.lms.identity.infrastructure.web;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.identity.application.usecase.UpdateUserUseCaseV3;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserControllerV3 bulk import tests")
class UserControllerV3BulkImportTest {

    @Mock private UserJpaRepository userRepository;
    @Mock private UpdateUserUseCaseV3 updateUserUseCaseV3;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JpaEnrollmentRepository enrollmentRepository;
    @Mock private JpaCourseRepository courseRepository;

    @InjectMocks private UserControllerV3 controller;

    private UUID organizationId;
    private UserJpaEntity orgAdmin;

    @BeforeEach
    void setUp() {
        organizationId = UUID.randomUUID();
        orgAdmin = new UserJpaEntity(
                UUID.randomUUID(), "orgadmin", "orgadmin@maritime.edu", "pass",
                "Org Admin", UserJpaEntity.UserRole.ORG_ADMIN, true, Instant.now(), null
        );
        orgAdmin.setOrganizationId(organizationId);
    }

    @Test
    @DisplayName("ORG_ADMIN bulk import should assign organization and report per-row result")
    void orgAdminBulkImportShouldAssignOrganizationAndReportResult() throws Exception {
        MockMultipartFile file = buildWorkbook(
                new String[]{"Username", "Email", "Full Name", "Password"},
                new String[]{"student-one", "student-one@test.com", "Student One", "Maritime@2026"},
                new String[]{"student-two", "", "Student Two", "Maritime@2026"}
        );

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(UserJpaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<ApiResponse<UserControllerV3.BulkImportResult>> response =
                controller.bulkImportUsers(file, "STUDENT", orgAdmin);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().totalRows()).isEqualTo(2);
        assertThat(response.getBody().getData().successfulImports()).isEqualTo(1);
        assertThat(response.getBody().getData().failedImports()).isEqualTo(1);
        assertThat(response.getBody().getData().errors()).hasSize(1);

        verify(userRepository).save(org.mockito.ArgumentMatchers.argThat(user ->
                organizationId.equals(user.getOrganizationId())
                        && user.getRole() == UserJpaEntity.UserRole.STUDENT
        ));
    }

    @Test
    @DisplayName("ORG_ADMIN should not bulk import admin accounts")
    void orgAdminShouldNotBulkImportAdminAccounts() throws Exception {
        MockMultipartFile file = buildWorkbook(
                new String[]{"Username", "Email", "Full Name"},
                new String[]{"admin-one", "admin-one@test.com", "Admin One"}
        );

        ResponseEntity<ApiResponse<UserControllerV3.BulkImportResult>> response =
                controller.bulkImportUsers(file, "ADMIN", orgAdmin);

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("ORG_ADMIN without organization should not bulk import")
    void orgAdminWithoutOrganizationShouldNotBulkImport() throws Exception {
        UserJpaEntity orgAdminWithoutOrg = new UserJpaEntity(
                UUID.randomUUID(), "orgadmin-no-org", "orgadmin-no-org@maritime.edu", "pass",
                "Org Admin No Org", UserJpaEntity.UserRole.ORG_ADMIN, true, Instant.now(), null
        );
        MockMultipartFile file = buildWorkbook(
                new String[]{"Username", "Email", "Full Name"},
                new String[]{"student-one", "student-one@test.com", "Student One"}
        );

        ResponseEntity<ApiResponse<UserControllerV3.BulkImportResult>> response =
                controller.bulkImportUsers(file, "STUDENT", orgAdminWithoutOrg);

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verify(userRepository, never()).save(any());
    }

    private MockMultipartFile buildWorkbook(String[] header, String[]... rows) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("Users");
            var headerRow = sheet.createRow(0);
            for (int i = 0; i < header.length; i++) {
                headerRow.createCell(i).setCellValue(header[i]);
            }

            for (int rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var row = sheet.createRow(rowIndex + 1);
                for (int columnIndex = 0; columnIndex < rows[rowIndex].length; columnIndex++) {
                    row.createCell(columnIndex).setCellValue(rows[rowIndex][columnIndex]);
                }
            }

            workbook.write(output);
            return new MockMultipartFile(
                    "file",
                    "users.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    output.toByteArray()
            );
        }
    }
}
