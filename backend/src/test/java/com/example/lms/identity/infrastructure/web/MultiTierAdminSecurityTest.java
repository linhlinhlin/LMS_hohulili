package com.example.lms.identity.infrastructure.web;

import com.example.lms.identity.application.usecase.UpdateUserUseCaseV3;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for Multi-Tier Admin security guards in UserControllerV3.
 *
 * Tests the business logic that prevents ORG_ADMIN from:
 * - Creating ADMIN/ORG_ADMIN users
 * - Modifying ADMIN/ORG_ADMIN users
 * - Escalating any user's role to ADMIN/ORG_ADMIN
 * - Toggling ADMIN/ORG_ADMIN account status
 *
 * Follows SOTA patterns from Canvas, Moodle, Coursera, Google Workspace 2026.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Multi-Tier Admin Security Tests")
class MultiTierAdminSecurityTest {

    @Mock private UserJpaRepository userRepository;
    @Mock private UpdateUserUseCaseV3 updateUserUseCaseV3;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JpaEnrollmentRepository enrollmentRepository;
    @Mock private JpaCourseRepository courseRepository;

    @InjectMocks private UserControllerV3 controller;

    private UUID organizationId;
    private UserJpaEntity systemAdmin;
    private UserJpaEntity orgAdmin;
    private UserJpaEntity teacher;
    private UserJpaEntity student;

    @BeforeEach
    void setUp() {
        organizationId = UUID.randomUUID();
        systemAdmin = new UserJpaEntity(
                UUID.randomUUID(), "admin", "admin@maritime.edu", "pass",
                "System Admin", UserJpaEntity.UserRole.ADMIN, true, Instant.now(), null
        );
        orgAdmin = new UserJpaEntity(
                UUID.randomUUID(), "orgadmin", "orgadmin@maritime.edu", "pass",
                "Org Admin", UserJpaEntity.UserRole.ORG_ADMIN, true, Instant.now(), null
        );
        orgAdmin.setOrganizationId(organizationId);
        teacher = new UserJpaEntity(
                UUID.randomUUID(), "teacher", "teacher@maritime.edu", "pass",
                "Teacher", UserJpaEntity.UserRole.TEACHER, true, Instant.now(), null
        );
        teacher.setOrganizationId(organizationId);
        student = new UserJpaEntity(
                UUID.randomUUID(), "student", "student@maritime.edu", "pass",
                "Student", UserJpaEntity.UserRole.STUDENT, true, Instant.now(), null
        );
        student.setOrganizationId(organizationId);
    }

    // =============================================
    // Create User Tests
    // =============================================

    @Nested
    @DisplayName("Create User - ORG_ADMIN Business Guards")
    class CreateUserOrgAdminTests {

        @Test
        @DisplayName("ORG_ADMIN should be able to create TEACHER")
        void orgAdminShouldCreateTeacher() {
            // Given
            var request = new UserControllerV3.CreateUserRequest(
                    "new@test.com", "New Teacher", "Maritime@2026", "TEACHER", null
            );
            when(userRepository.existsByEmail("new@test.com")).thenReturn(false);
            when(passwordEncoder.encode("Maritime@2026")).thenReturn("encoded");
            when(userRepository.save(any(UserJpaEntity.class))).thenAnswer(i -> i.getArgument(0));

            // When
            ResponseEntity<?> response = controller.createUser(request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(userRepository).save(argThat(user ->
                    organizationId.equals(user.getOrganizationId())
                            && user.getRole() == UserJpaEntity.UserRole.TEACHER
            ));
        }

        @Test
        @DisplayName("ORG_ADMIN should be able to create STUDENT")
        void orgAdminShouldCreateStudent() {
            // Given
            var request = new UserControllerV3.CreateUserRequest(
                    "student@test.com", "New Student", "Maritime@2026", "STUDENT", null
            );
            when(userRepository.existsByEmail("student@test.com")).thenReturn(false);
            when(passwordEncoder.encode("Maritime@2026")).thenReturn("encoded");
            when(userRepository.save(any(UserJpaEntity.class))).thenAnswer(i -> i.getArgument(0));

            // When
            ResponseEntity<?> response = controller.createUser(request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(userRepository).save(argThat(user ->
                    organizationId.equals(user.getOrganizationId())
                            && user.getRole() == UserJpaEntity.UserRole.STUDENT
            ));
        }

        @Test
        @DisplayName("ORG_ADMIN should NOT be able to create ADMIN")
        void orgAdminShouldNotCreateAdmin() {
            // Given
            var request = new UserControllerV3.CreateUserRequest(
                    "newadmin@test.com", "New Admin", "Maritime@2026", "ADMIN", null
            );

            // When
            ResponseEntity<?> response = controller.createUser(request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(403);
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("ORG_ADMIN should NOT be able to create ORG_ADMIN")
        void orgAdminShouldNotCreateOrgAdmin() {
            // Given
            var request = new UserControllerV3.CreateUserRequest(
                    "neworg@test.com", "New Org Admin", "Maritime@2026", "ORG_ADMIN", null
            );

            // When
            ResponseEntity<?> response = controller.createUser(request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(403);
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("ADMIN should be able to create ADMIN")
        void adminShouldCreateAdmin() {
            // Given
            var request = new UserControllerV3.CreateUserRequest(
                    "newadmin@test.com", "New Admin", "Maritime@2026", "ADMIN", null
            );
            when(userRepository.existsByEmail("newadmin@test.com")).thenReturn(false);
            when(passwordEncoder.encode("Maritime@2026")).thenReturn("encoded");
            when(userRepository.save(any(UserJpaEntity.class))).thenAnswer(i -> i.getArgument(0));

            // When
            ResponseEntity<?> response = controller.createUser(request, systemAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(userRepository).save(argThat(user ->
                    user.getOrganizationId() == null
                            && user.getRole() == UserJpaEntity.UserRole.ADMIN
            ));
        }

        @Test
        @DisplayName("ADMIN should be able to create ORG_ADMIN")
        void adminShouldCreateOrgAdmin() {
            // Given
            var request = new UserControllerV3.CreateUserRequest(
                    "neworg@test.com", "New Org Admin", "Maritime@2026", "ORG_ADMIN", null
            );
            when(userRepository.existsByEmail("neworg@test.com")).thenReturn(false);
            when(passwordEncoder.encode("Maritime@2026")).thenReturn("encoded");
            when(userRepository.save(any(UserJpaEntity.class))).thenAnswer(i -> i.getArgument(0));

            // When
            ResponseEntity<?> response = controller.createUser(request, systemAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(userRepository).save(any(UserJpaEntity.class));
        }
    }

    // =============================================
    // Update User Tests
    // =============================================

    @Nested
    @DisplayName("Update User - ORG_ADMIN Business Guards")
    class UpdateUserOrgAdminTests {

        @Test
        @DisplayName("ORG_ADMIN should NOT be able to update ADMIN user")
        void orgAdminShouldNotUpdateAdminUser() {
            // Given
            when(userRepository.findById(systemAdmin.getId())).thenReturn(Optional.of(systemAdmin));
            var request = new UserControllerV3.UpdateUserRequest("New Name", null, null);

            // When
            ResponseEntity<?> response = controller.updateUser(systemAdmin.getId(), request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(403);
            verify(updateUserUseCaseV3, never()).execute(any(), any());
        }

        @Test
        @DisplayName("ORG_ADMIN should NOT be able to update another ORG_ADMIN user")
        void orgAdminShouldNotUpdateOrgAdminUser() {
            // Given
            UserJpaEntity otherOrgAdmin = new UserJpaEntity(
                    UUID.randomUUID(), "orgadmin2", "orgadmin2@test.com", "pass",
                    "Other Org Admin", UserJpaEntity.UserRole.ORG_ADMIN, true, Instant.now(), null
            );
            when(userRepository.findById(otherOrgAdmin.getId())).thenReturn(Optional.of(otherOrgAdmin));
            var request = new UserControllerV3.UpdateUserRequest("New Name", null, null);

            // When
            ResponseEntity<?> response = controller.updateUser(otherOrgAdmin.getId(), request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(403);
            verify(updateUserUseCaseV3, never()).execute(any(), any());
        }

        @Test
        @DisplayName("ORG_ADMIN should be able to update TEACHER user")
        void orgAdminShouldUpdateTeacherUser() {
            // Given
            when(userRepository.findById(teacher.getId())).thenReturn(Optional.of(teacher));
            when(updateUserUseCaseV3.execute(eq(teacher.getId()), any()))
                    .thenReturn(Optional.of(mockDomainUser(teacher)));
            var request = new UserControllerV3.UpdateUserRequest("Updated Teacher", null, null);

            // When
            ResponseEntity<?> response = controller.updateUser(teacher.getId(), request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(updateUserUseCaseV3).execute(eq(teacher.getId()), any());
        }

        @Test
        @DisplayName("ORG_ADMIN should be able to update STUDENT user")
        void orgAdminShouldUpdateStudentUser() {
            // Given
            when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
            when(updateUserUseCaseV3.execute(eq(student.getId()), any()))
                    .thenReturn(Optional.of(mockDomainUser(student)));
            var request = new UserControllerV3.UpdateUserRequest("Updated Student", null, null);

            // When
            ResponseEntity<?> response = controller.updateUser(student.getId(), request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(updateUserUseCaseV3).execute(eq(student.getId()), any());
        }

        @Test
        @DisplayName("ORG_ADMIN should NOT be able to update user outside organization")
        void orgAdminShouldNotUpdateUserOutsideOrganization() {
            UserJpaEntity externalStudent = new UserJpaEntity(
                    UUID.randomUUID(), "external", "external@test.com", "pass",
                    "External Student", UserJpaEntity.UserRole.STUDENT, true, Instant.now(), null
            );
            externalStudent.setOrganizationId(UUID.randomUUID());
            when(userRepository.findById(externalStudent.getId())).thenReturn(Optional.of(externalStudent));
            var request = new UserControllerV3.UpdateUserRequest("Updated Student", null, null);

            ResponseEntity<?> response = controller.updateUser(externalStudent.getId(), request, orgAdmin);

            assertThat(response.getStatusCode().value()).isEqualTo(403);
            verify(updateUserUseCaseV3, never()).execute(any(), any());
        }

        @Test
        @DisplayName("ADMIN should be able to update ADMIN user")
        void adminShouldUpdateAdminUser() {
            // Given
            UserJpaEntity otherAdmin = new UserJpaEntity(
                    UUID.randomUUID(), "admin2", "admin2@test.com", "pass",
                    "Other Admin", UserJpaEntity.UserRole.ADMIN, true, Instant.now(), null
            );
            when(updateUserUseCaseV3.execute(eq(otherAdmin.getId()), any()))
                    .thenReturn(Optional.of(mockDomainUser(otherAdmin)));
            var request = new UserControllerV3.UpdateUserRequest("Updated Admin", null, null);

            // When
            ResponseEntity<?> response = controller.updateUser(otherAdmin.getId(), request, systemAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
        }
    }

    // =============================================
    // Role Escalation Prevention Tests (CRITICAL)
    // =============================================

    @Nested
    @DisplayName("Role Escalation Prevention - ORG_ADMIN")
    class RoleEscalationPreventionTests {

        @Test
        @DisplayName("ORG_ADMIN should NOT escalate STUDENT to ADMIN")
        void orgAdminShouldNotEscalateStudentToAdmin() {
            // Given
            when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
            var request = new UserControllerV3.UpdateUserRequest(null, "ADMIN", null);

            // When
            ResponseEntity<?> response = controller.updateUser(student.getId(), request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(403);
            verify(updateUserUseCaseV3, never()).execute(any(), any());
        }

        @Test
        @DisplayName("ORG_ADMIN should NOT escalate STUDENT to ORG_ADMIN")
        void orgAdminShouldNotEscalateStudentToOrgAdmin() {
            // Given
            when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
            var request = new UserControllerV3.UpdateUserRequest(null, "ORG_ADMIN", null);

            // When
            ResponseEntity<?> response = controller.updateUser(student.getId(), request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(403);
            verify(updateUserUseCaseV3, never()).execute(any(), any());
        }

        @Test
        @DisplayName("ORG_ADMIN should NOT escalate TEACHER to ADMIN")
        void orgAdminShouldNotEscalateTeacherToAdmin() {
            // Given
            when(userRepository.findById(teacher.getId())).thenReturn(Optional.of(teacher));
            var request = new UserControllerV3.UpdateUserRequest(null, "ADMIN", null);

            // When
            ResponseEntity<?> response = controller.updateUser(teacher.getId(), request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(403);
            verify(updateUserUseCaseV3, never()).execute(any(), any());
        }

        @Test
        @DisplayName("ORG_ADMIN should NOT escalate TEACHER to ORG_ADMIN")
        void orgAdminShouldNotEscalateTeacherToOrgAdmin() {
            // Given
            when(userRepository.findById(teacher.getId())).thenReturn(Optional.of(teacher));
            var request = new UserControllerV3.UpdateUserRequest(null, "ORG_ADMIN", null);

            // When
            ResponseEntity<?> response = controller.updateUser(teacher.getId(), request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(403);
            verify(updateUserUseCaseV3, never()).execute(any(), any());
        }

        @Test
        @DisplayName("ORG_ADMIN SHOULD change STUDENT to TEACHER (non-admin role change)")
        void orgAdminShouldChangeStudentToTeacher() {
            // Given
            when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
            when(updateUserUseCaseV3.execute(eq(student.getId()), any()))
                    .thenReturn(Optional.of(mockDomainUser(student)));
            var request = new UserControllerV3.UpdateUserRequest(null, "TEACHER", null);

            // When
            ResponseEntity<?> response = controller.updateUser(student.getId(), request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(updateUserUseCaseV3).execute(eq(student.getId()), any());
        }

        @Test
        @DisplayName("ADMIN SHOULD escalate STUDENT to ADMIN (system admin privilege)")
        void adminShouldEscalateStudentToAdmin() {
            // Given - ADMIN has no restrictions
            when(updateUserUseCaseV3.execute(eq(student.getId()), any()))
                    .thenReturn(Optional.of(mockDomainUser(student)));
            var request = new UserControllerV3.UpdateUserRequest(null, "ADMIN", null);

            // When
            ResponseEntity<?> response = controller.updateUser(student.getId(), request, systemAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(updateUserUseCaseV3).execute(eq(student.getId()), any());
        }

        @Test
        @DisplayName("ADMIN SHOULD escalate STUDENT to ORG_ADMIN (system admin privilege)")
        void adminShouldEscalateStudentToOrgAdmin() {
            // Given
            when(updateUserUseCaseV3.execute(eq(student.getId()), any()))
                    .thenReturn(Optional.of(mockDomainUser(student)));
            var request = new UserControllerV3.UpdateUserRequest(null, "ORG_ADMIN", null);

            // When
            ResponseEntity<?> response = controller.updateUser(student.getId(), request, systemAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
        }
    }

    // =============================================
    // Toggle Status Tests
    // =============================================

    @Nested
    @DisplayName("Toggle Status - ORG_ADMIN Business Guards")
    class ToggleStatusOrgAdminTests {

        @Test
        @DisplayName("ORG_ADMIN should NOT toggle ADMIN status")
        void orgAdminShouldNotToggleAdminStatus() {
            // Given
            when(userRepository.findById(systemAdmin.getId())).thenReturn(Optional.of(systemAdmin));

            // When
            ResponseEntity<?> response = controller.toggleUserStatus(systemAdmin.getId(), orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(403);
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("ORG_ADMIN should NOT toggle another ORG_ADMIN status")
        void orgAdminShouldNotToggleOrgAdminStatus() {
            // Given
            UserJpaEntity otherOrgAdmin = new UserJpaEntity(
                    UUID.randomUUID(), "orgadmin2", "orgadmin2@test.com", "pass",
                    "Other Org Admin", UserJpaEntity.UserRole.ORG_ADMIN, true, Instant.now(), null
            );
            when(userRepository.findById(otherOrgAdmin.getId())).thenReturn(Optional.of(otherOrgAdmin));

            // When
            ResponseEntity<?> response = controller.toggleUserStatus(otherOrgAdmin.getId(), orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(403);
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("ORG_ADMIN SHOULD toggle TEACHER status")
        void orgAdminShouldToggleTeacherStatus() {
            // Given
            when(userRepository.findById(teacher.getId())).thenReturn(Optional.of(teacher));
            when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            // When
            ResponseEntity<?> response = controller.toggleUserStatus(teacher.getId(), orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(userRepository).save(any(UserJpaEntity.class));
        }

        @Test
        @DisplayName("ORG_ADMIN SHOULD toggle STUDENT status")
        void orgAdminShouldToggleStudentStatus() {
            // Given
            when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
            when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            // When
            ResponseEntity<?> response = controller.toggleUserStatus(student.getId(), orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(userRepository).save(any(UserJpaEntity.class));
        }

        @Test
        @DisplayName("ORG_ADMIN should NOT toggle status for user outside organization")
        void orgAdminShouldNotToggleStatusOutsideOrganization() {
            UserJpaEntity externalTeacher = new UserJpaEntity(
                    UUID.randomUUID(), "external-teacher", "external-teacher@test.com", "pass",
                    "External Teacher", UserJpaEntity.UserRole.TEACHER, true, Instant.now(), null
            );
            externalTeacher.setOrganizationId(UUID.randomUUID());
            when(userRepository.findById(externalTeacher.getId())).thenReturn(Optional.of(externalTeacher));

            ResponseEntity<?> response = controller.toggleUserStatus(externalTeacher.getId(), orgAdmin);

            assertThat(response.getStatusCode().value()).isEqualTo(403);
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("ADMIN SHOULD toggle any user status")
        void adminShouldToggleAnyUserStatus() {
            // Given
            when(userRepository.findById(orgAdmin.getId())).thenReturn(Optional.of(orgAdmin));
            when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            // When
            ResponseEntity<?> response = controller.toggleUserStatus(orgAdmin.getId(), systemAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(userRepository).save(any(UserJpaEntity.class));
        }
    }

    // =============================================
    // Update Status Tests
    // =============================================

    @Nested
    @DisplayName("Update Status - ORG_ADMIN Business Guards")
    class UpdateStatusOrgAdminTests {

        @Test
        @DisplayName("ORG_ADMIN should NOT change ADMIN account status")
        void orgAdminShouldNotChangeAdminStatus() {
            // Given
            when(userRepository.findById(systemAdmin.getId())).thenReturn(Optional.of(systemAdmin));
            var request = new UserControllerV3.UpdateStatusRequest("BLOCKED", "Test");

            // When
            ResponseEntity<?> response = controller.updateUserStatus(systemAdmin.getId(), request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(403);
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("ORG_ADMIN SHOULD change STUDENT account status")
        void orgAdminShouldChangeStudentStatus() {
            // Given
            when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
            when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));
            var request = new UserControllerV3.UpdateStatusRequest("BLOCKED", "Violation");

            // When
            ResponseEntity<?> response = controller.updateUserStatus(student.getId(), request, orgAdmin);

            // Then
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(userRepository).save(any(UserJpaEntity.class));
        }

        @Test
        @DisplayName("ORG_ADMIN should NOT change account status outside organization")
        void orgAdminShouldNotChangeStatusOutsideOrganization() {
            UserJpaEntity externalStudent = new UserJpaEntity(
                    UUID.randomUUID(), "external-student", "external-student@test.com", "pass",
                    "External Student", UserJpaEntity.UserRole.STUDENT, true, Instant.now(), null
            );
            externalStudent.setOrganizationId(UUID.randomUUID());
            when(userRepository.findById(externalStudent.getId())).thenReturn(Optional.of(externalStudent));
            var request = new UserControllerV3.UpdateStatusRequest("BLOCKED", "Violation");

            ResponseEntity<?> response = controller.updateUserStatus(externalStudent.getId(), request, orgAdmin);

            assertThat(response.getStatusCode().value()).isEqualTo(403);
            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Read User - ORG_ADMIN Scope Guards")
    class ReadUserScopeTests {

        @Test
        @DisplayName("ORG_ADMIN should NOT view user outside organization")
        void orgAdminShouldNotViewUserOutsideOrganization() {
            UserJpaEntity externalStudent = new UserJpaEntity(
                    UUID.randomUUID(), "external-view", "external-view@test.com", "pass",
                    "External View", UserJpaEntity.UserRole.STUDENT, true, Instant.now(), null
            );
            externalStudent.setOrganizationId(UUID.randomUUID());
            when(userRepository.findById(externalStudent.getId())).thenReturn(Optional.of(externalStudent));

            ResponseEntity<?> response = controller.getUserById(externalStudent.getId(), orgAdmin);

            assertThat(response.getStatusCode().value()).isEqualTo(403);
        }
    }

    @Nested
    @DisplayName("Search Users - Teacher Scope Guards")
    class SearchUsersScopeTests {

        @Test
        @DisplayName("TEACHER should NOT search student accounts through admin user search")
        void teacherShouldNotSearchStudentAccounts() {
            ResponseEntity<?> response = controller.searchUsers("STUDENT", "student", 1, 10, teacher);

            assertThat(response.getStatusCode().value()).isEqualTo(403);
        }
    }

    // =============================================
    // Helper
    // =============================================

    private User mockDomainUser(UserJpaEntity jpaEntity) {
        com.example.lms.identity.domain.model.Role domainRole = switch (jpaEntity.getRole()) {
            case ADMIN -> com.example.lms.identity.domain.model.Role.ADMIN;
            case ORG_ADMIN -> com.example.lms.identity.domain.model.Role.ORG_ADMIN;
            case TEACHER -> com.example.lms.identity.domain.model.Role.TEACHER;
            case STUDENT -> com.example.lms.identity.domain.model.Role.STUDENT;
        };
        return User.builder()
                .id(com.example.lms.shared.domain.valueobject.UserId.of(jpaEntity.getId()))
                .username(jpaEntity.getDisplayName())
                .email(com.example.lms.shared.domain.valueobject.Email.of(jpaEntity.getEmail()))
                .password("encoded")
                .fullName(jpaEntity.getFullName())
                .role(domainRole)
                .enabled(true)
                .build();
    }
}
