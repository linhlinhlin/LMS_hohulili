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

        @Test
        @DisplayName("isTeacher should return true for TEACHER and ADMIN")
        void isTeacherShouldReturnTrueForTeacherAndAdmin() {
            User teacher = User.createNew("t", validEmail, "p", "T", Role.TEACHER);
            User admin = User.createNew("a", Email.of("admin@test.com"), "p", "A", Role.ADMIN);
            User student = User.createNew("s", Email.of("student@test.com"), "p", "S", Role.STUDENT);

            assertThat(teacher.isTeacher()).isTrue();
            assertThat(admin.isTeacher()).isTrue();
            assertThat(student.isTeacher()).isFalse();
        }

        @Test
        @DisplayName("isAdmin should return true only for ADMIN")
        void isAdminShouldReturnTrueOnlyForAdmin() {
            User admin = User.createNew("a", validEmail, "p", "A", Role.ADMIN);
            User teacher = User.createNew("t", Email.of("teacher@test.com"), "p", "T", Role.TEACHER);

            assertThat(admin.isAdmin()).isTrue();
            assertThat(teacher.isAdmin()).isFalse();
        }

        @Test
        @DisplayName("isStudent should return true only for STUDENT")
        void isStudentShouldReturnTrueOnlyForStudent() {
            User student = User.createNew("s", validEmail, "p", "S", Role.STUDENT);
            User teacher = User.createNew("t", Email.of("teacher@test.com"), "p", "T", Role.TEACHER);

            assertThat(student.isStudent()).isTrue();
            assertThat(teacher.isStudent()).isFalse();
        }
    }
}
