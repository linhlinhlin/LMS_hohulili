package com.example.lms.identity.infrastructure.persistence.entity;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.security.core.GrantedAuthority;

import java.time.Instant;
import java.util.Collection;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for UserJpaEntity.
 * Focuses on UserDetails implementation and UserRole enum,
 * especially ORG_ADMIN authority generation.
 */
@DisplayName("UserJpaEntity Tests")
class UserJpaEntityTest {

    private UserJpaEntity entity;

    @BeforeEach
    void setUp() {
        entity = new UserJpaEntity(
                UUID.randomUUID(), "john_doe", "john@maritime.edu", "encodedPass",
                "John Doe", UserJpaEntity.UserRole.STUDENT, true, Instant.now(), null
        );
    }

    @Nested
    @DisplayName("UserDetails Implementation Tests")
    class UserDetailsTests {

        @Test
        @DisplayName("getUsername should return email (not username field)")
        void getUsernameShouldReturnEmail() {
            assertThat(entity.getUsername()).isEqualTo("john@maritime.edu");
        }

        @Test
        @DisplayName("getDisplayName should return actual username field")
        void getDisplayNameShouldReturnActualUsername() {
            assertThat(entity.getDisplayName()).isEqualTo("john_doe");
        }

        @Test
        @DisplayName("isEnabled should return true when enabled is TRUE")
        void isEnabledShouldReturnTrue() {
            entity.setEnabled(true);
            assertThat(entity.isEnabled()).isTrue();
        }

        @Test
        @DisplayName("isEnabled should return false when enabled is FALSE")
        void isEnabledShouldReturnFalseWhenDisabled() {
            entity.setEnabled(false);
            assertThat(entity.isEnabled()).isFalse();
        }

        @Test
        @DisplayName("isEnabled should return false when enabled is NULL")
        void isEnabledShouldReturnFalseWhenNull() {
            entity.setEnabled(null);
            assertThat(entity.isEnabled()).isFalse();
        }

        @Test
        @DisplayName("Account should never be expired, locked, or have expired credentials")
        void accountShouldAlwaysBeActive() {
            assertThat(entity.isAccountNonExpired()).isTrue();
            assertThat(entity.isAccountNonLocked()).isTrue();
            assertThat(entity.isCredentialsNonExpired()).isTrue();
        }
    }

    @Nested
    @DisplayName("Authority Generation Tests")
    class AuthorityTests {

        @Test
        @DisplayName("STUDENT should generate ROLE_STUDENT authority")
        void studentShouldGenerateRoleStudent() {
            entity.setRole(UserJpaEntity.UserRole.STUDENT);
            Collection<? extends GrantedAuthority> authorities = entity.getAuthorities();

            assertThat(authorities).hasSize(1);
            assertThat(authorities.iterator().next().getAuthority()).isEqualTo("ROLE_STUDENT");
        }

        @Test
        @DisplayName("TEACHER should generate ROLE_TEACHER authority")
        void teacherShouldGenerateRoleTeacher() {
            entity.setRole(UserJpaEntity.UserRole.TEACHER);
            Collection<? extends GrantedAuthority> authorities = entity.getAuthorities();

            assertThat(authorities).hasSize(1);
            assertThat(authorities.iterator().next().getAuthority()).isEqualTo("ROLE_TEACHER");
        }

        @Test
        @DisplayName("ADMIN should generate ROLE_ADMIN authority")
        void adminShouldGenerateRoleAdmin() {
            entity.setRole(UserJpaEntity.UserRole.ADMIN);
            Collection<? extends GrantedAuthority> authorities = entity.getAuthorities();

            assertThat(authorities).hasSize(1);
            assertThat(authorities.iterator().next().getAuthority()).isEqualTo("ROLE_ADMIN");
        }

        @Test
        @DisplayName("ORG_ADMIN should generate ROLE_ORG_ADMIN authority")
        void orgAdminShouldGenerateRoleOrgAdmin() {
            entity.setRole(UserJpaEntity.UserRole.ORG_ADMIN);
            Collection<? extends GrantedAuthority> authorities = entity.getAuthorities();

            assertThat(authorities).hasSize(1);
            assertThat(authorities.iterator().next().getAuthority()).isEqualTo("ROLE_ORG_ADMIN");
        }

        @Test
        @DisplayName("Null role should generate empty authority list")
        void nullRoleShouldGenerateEmptyAuthorities() {
            entity.setRole(null);
            Collection<? extends GrantedAuthority> authorities = entity.getAuthorities();

            assertThat(authorities).isEmpty();
        }

        @ParameterizedTest
        @EnumSource(UserJpaEntity.UserRole.class)
        @DisplayName("Every role should generate exactly one ROLE_ prefixed authority")
        void everyRoleShouldGenerateRolePrefixedAuthority(UserJpaEntity.UserRole role) {
            entity.setRole(role);
            Collection<? extends GrantedAuthority> authorities = entity.getAuthorities();

            assertThat(authorities).hasSize(1);
            String authority = authorities.iterator().next().getAuthority();
            assertThat(authority).startsWith("ROLE_");
            assertThat(authority).isEqualTo("ROLE_" + role.name());
        }
    }

    @Nested
    @DisplayName("UserRole Enum Tests")
    class UserRoleEnumTests {

        @Test
        @DisplayName("Should have exactly 4 user roles")
        void shouldHaveExactlyFourRoles() {
            assertThat(UserJpaEntity.UserRole.values()).hasSize(4);
        }

        @Test
        @DisplayName("Should contain ORG_ADMIN")
        void shouldContainOrgAdmin() {
            assertThat(UserJpaEntity.UserRole.valueOf("ORG_ADMIN"))
                    .isEqualTo(UserJpaEntity.UserRole.ORG_ADMIN);
        }

        @Test
        @DisplayName("ORG_ADMIN should have correct display name")
        void orgAdminShouldHaveCorrectDisplayName() {
            assertThat(UserJpaEntity.UserRole.ORG_ADMIN.getDisplayName())
                    .isEqualTo("Chuyên viên quản lý");
        }

        @ParameterizedTest
        @EnumSource(UserJpaEntity.UserRole.class)
        @DisplayName("Every role should have a non-blank display name")
        void everyRoleShouldHaveDisplayName(UserJpaEntity.UserRole role) {
            assertThat(role.getDisplayName()).isNotBlank();
        }
    }

    @Nested
    @DisplayName("Equality Tests")
    class EqualityTests {

        @Test
        @DisplayName("Two entities with same ID should be equal")
        void sameIdShouldBeEqual() {
            UUID id = UUID.randomUUID();
            UserJpaEntity a = new UserJpaEntity(id, "a", "a@test.com", "p", "A",
                    UserJpaEntity.UserRole.ADMIN, true, Instant.now(), null);
            UserJpaEntity b = new UserJpaEntity(id, "b", "b@test.com", "p", "B",
                    UserJpaEntity.UserRole.ORG_ADMIN, true, Instant.now(), null);

            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("Two entities with different IDs should not be equal")
        void differentIdShouldNotBeEqual() {
            UserJpaEntity a = new UserJpaEntity(UUID.randomUUID(), "a", "a@test.com", "p", "A",
                    UserJpaEntity.UserRole.ADMIN, true, Instant.now(), null);
            UserJpaEntity b = new UserJpaEntity(UUID.randomUUID(), "a", "a@test.com", "p", "A",
                    UserJpaEntity.UserRole.ADMIN, true, Instant.now(), null);

            assertThat(a).isNotEqualTo(b);
        }
    }
}
