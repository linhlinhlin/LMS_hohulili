package com.example.lms.identity.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for Role domain enum.
 * Verifies all 4 roles exist with correct display names.
 */
@DisplayName("Role Enum Tests")
class RoleTest {

    @Nested
    @DisplayName("Enum Values Tests")
    class EnumValuesTests {

        @Test
        @DisplayName("Should have exactly 4 roles")
        void shouldHaveExactlyFourRoles() {
            assertThat(Role.values()).hasSize(4);
        }

        @Test
        @DisplayName("Should contain all expected roles")
        void shouldContainAllExpectedRoles() {
            assertThat(Role.values()).containsExactly(
                    Role.ADMIN, Role.ORG_ADMIN, Role.TEACHER, Role.STUDENT
            );
        }
    }

    @Nested
    @DisplayName("Display Name Tests")
    class DisplayNameTests {

        @Test
        @DisplayName("ADMIN should have correct Vietnamese display name")
        void adminShouldHaveCorrectDisplayName() {
            assertThat(Role.ADMIN.getDisplayName()).isEqualTo("Quản trị hệ thống");
        }

        @Test
        @DisplayName("ORG_ADMIN should have correct Vietnamese display name")
        void orgAdminShouldHaveCorrectDisplayName() {
            assertThat(Role.ORG_ADMIN.getDisplayName()).isEqualTo("Chuyên viên quản lý");
        }

        @Test
        @DisplayName("TEACHER should have correct Vietnamese display name")
        void teacherShouldHaveCorrectDisplayName() {
            assertThat(Role.TEACHER.getDisplayName()).isEqualTo("Giảng viên");
        }

        @Test
        @DisplayName("STUDENT should have correct Vietnamese display name")
        void studentShouldHaveCorrectDisplayName() {
            assertThat(Role.STUDENT.getDisplayName()).isEqualTo("Học viên");
        }

        @ParameterizedTest
        @EnumSource(Role.class)
        @DisplayName("Every role should have a non-blank display name")
        void everyRoleShouldHaveNonBlankDisplayName(Role role) {
            assertThat(role.getDisplayName()).isNotBlank();
        }
    }

    @Nested
    @DisplayName("valueOf Tests")
    class ValueOfTests {

        @Test
        @DisplayName("Should resolve ADMIN from string")
        void shouldResolveAdmin() {
            assertThat(Role.valueOf("ADMIN")).isEqualTo(Role.ADMIN);
        }

        @Test
        @DisplayName("Should resolve ORG_ADMIN from string")
        void shouldResolveOrgAdmin() {
            assertThat(Role.valueOf("ORG_ADMIN")).isEqualTo(Role.ORG_ADMIN);
        }

        @Test
        @DisplayName("Should resolve TEACHER from string")
        void shouldResolveTeacher() {
            assertThat(Role.valueOf("TEACHER")).isEqualTo(Role.TEACHER);
        }

        @Test
        @DisplayName("Should resolve STUDENT from string")
        void shouldResolveStudent() {
            assertThat(Role.valueOf("STUDENT")).isEqualTo(Role.STUDENT);
        }

        @Test
        @DisplayName("Should throw for invalid role name")
        void shouldThrowForInvalidRoleName() {
            assertThatThrownBy(() -> Role.valueOf("SUPERADMIN"))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
