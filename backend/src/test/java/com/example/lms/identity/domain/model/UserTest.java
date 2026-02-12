package com.example.lms.identity.domain.model;

import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for User domain model.
 */
@DisplayName("User Domain Model Tests")
class UserTest {

    private Email validEmail;

    @BeforeEach
    void setUp() {
        validEmail = Email.of("test@maritime.edu");
    }

    @Nested
    @DisplayName("Factory Method Tests")
    class FactoryMethodTests {

        @Test
        @DisplayName("Should create new user enabled by default")
        void shouldCreateNewUserEnabledByDefault() {
            // When
            User user = User.createNew("john_doe", validEmail, "encodedPass", "John Doe", Role.STUDENT);

            // Then
            assertThat(user.getId()).isNotNull();
            assertThat(user.getUsername()).isEqualTo("john_doe");
            assertThat(user.getEmail()).isEqualTo(validEmail);
            assertThat(user.getFullName()).isEqualTo("John Doe");
            assertThat(user.getRole()).isEqualTo(Role.STUDENT);
            assertThat(user.isEnabled()).isTrue();
            assertThat(user.getCreatedAt()).isNotNull();
        }
    }

    @Nested
    @DisplayName("Business Method Tests")
    class BusinessMethodTests {

        @Test
        @DisplayName("Should update profile")
        void shouldUpdateProfile() {
            // Given
            User user = User.createNew("john_doe", validEmail, "pass", "John Doe", Role.STUDENT);
            Email newEmail = Email.of("jane@maritime.edu");

            // When
            user.updateProfile("Jane Doe", newEmail);

            // Then
            assertThat(user.getFullName()).isEqualTo("Jane Doe");
            assertThat(user.getEmail()).isEqualTo(newEmail);
            assertThat(user.getUpdatedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should change role")
        void shouldChangeRole() {
            // Given
            User user = User.createNew("john_doe", validEmail, "pass", "John", Role.STUDENT);

            // When
            user.changeRole(Role.TEACHER);

            // Then
            assertThat(user.getRole()).isEqualTo(Role.TEACHER);
        }

        @Test
        @DisplayName("Should disable and enable user")
        void shouldDisableAndEnableUser() {
            // Given
            User user = User.createNew("john_doe", validEmail, "pass", "John", Role.STUDENT);

            // When
            user.disable();
            assertThat(user.isEnabled()).isFalse();

            user.enable();
            assertThat(user.isEnabled()).isTrue();
        }
    }

    @Nested
    @DisplayName("Role Query Tests")
    class RoleQueryTests {

        private User admin;
        private User orgAdmin;
        private User teacher;
        private User student;

        @BeforeEach
        void setUpRoleUsers() {
            admin = User.createNew("a", Email.of("admin@test.com"), "p", "A", Role.ADMIN);
            orgAdmin = User.createNew("o", Email.of("orgadmin@test.com"), "p", "O", Role.ORG_ADMIN);
            teacher = User.createNew("t", Email.of("teacher@test.com"), "p", "T", Role.TEACHER);
            student = User.createNew("s", validEmail, "p", "S", Role.STUDENT);
        }

        @Test
        @DisplayName("isTeacher should return true for TEACHER, ADMIN, and ORG_ADMIN")
        void isTeacherShouldReturnTrueForTeacherAdminAndOrgAdmin() {
            assertThat(teacher.isTeacher()).isTrue();
            assertThat(admin.isTeacher()).isTrue();
            assertThat(orgAdmin.isTeacher()).isTrue();
            assertThat(student.isTeacher()).isFalse();
        }

        @Test
        @DisplayName("isAdmin should return true for ADMIN and ORG_ADMIN")
        void isAdminShouldReturnTrueForAdminAndOrgAdmin() {
            assertThat(admin.isAdmin()).isTrue();
            assertThat(orgAdmin.isAdmin()).isTrue();
            assertThat(teacher.isAdmin()).isFalse();
            assertThat(student.isAdmin()).isFalse();
        }

        @Test
        @DisplayName("isSystemAdmin should return true only for ADMIN")
        void isSystemAdminShouldReturnTrueOnlyForAdmin() {
            assertThat(admin.isSystemAdmin()).isTrue();
            assertThat(orgAdmin.isSystemAdmin()).isFalse();
            assertThat(teacher.isSystemAdmin()).isFalse();
            assertThat(student.isSystemAdmin()).isFalse();
        }

        @Test
        @DisplayName("isOrgAdmin should return true only for ORG_ADMIN")
        void isOrgAdminShouldReturnTrueOnlyForOrgAdmin() {
            assertThat(orgAdmin.isOrgAdmin()).isTrue();
            assertThat(admin.isOrgAdmin()).isFalse();
            assertThat(teacher.isOrgAdmin()).isFalse();
            assertThat(student.isOrgAdmin()).isFalse();
        }

        @Test
        @DisplayName("isStudent should return true only for STUDENT")
        void isStudentShouldReturnTrueOnlyForStudent() {
            assertThat(student.isStudent()).isTrue();
            assertThat(admin.isStudent()).isFalse();
            assertThat(orgAdmin.isStudent()).isFalse();
            assertThat(teacher.isStudent()).isFalse();
        }
    }

    @Nested
    @DisplayName("ORG_ADMIN Role Transition Tests")
    class OrgAdminRoleTransitionTests {

        @Test
        @DisplayName("Should change role from STUDENT to ORG_ADMIN")
        void shouldChangeRoleToOrgAdmin() {
            User user = User.createNew("u", validEmail, "p", "User", Role.STUDENT);

            user.changeRole(Role.ORG_ADMIN);

            assertThat(user.getRole()).isEqualTo(Role.ORG_ADMIN);
            assertThat(user.isOrgAdmin()).isTrue();
            assertThat(user.isAdmin()).isTrue();
            assertThat(user.isTeacher()).isTrue();
            assertThat(user.isStudent()).isFalse();
            assertThat(user.getUpdatedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should change role from ORG_ADMIN to TEACHER")
        void shouldChangeRoleFromOrgAdminToTeacher() {
            User user = User.createNew("u", validEmail, "p", "User", Role.ORG_ADMIN);

            user.changeRole(Role.TEACHER);

            assertThat(user.getRole()).isEqualTo(Role.TEACHER);
            assertThat(user.isOrgAdmin()).isFalse();
            assertThat(user.isAdmin()).isFalse();
            assertThat(user.isTeacher()).isTrue();
        }

        @Test
        @DisplayName("Should create new user with ORG_ADMIN role")
        void shouldCreateNewUserWithOrgAdminRole() {
            User user = User.createNew("orgadmin", validEmail, "encodedPass", "Org Admin", Role.ORG_ADMIN);

            assertThat(user.getRole()).isEqualTo(Role.ORG_ADMIN);
            assertThat(user.isEnabled()).isTrue();
            assertThat(user.isAdmin()).isTrue();
            assertThat(user.isSystemAdmin()).isFalse();
        }
    }
}
