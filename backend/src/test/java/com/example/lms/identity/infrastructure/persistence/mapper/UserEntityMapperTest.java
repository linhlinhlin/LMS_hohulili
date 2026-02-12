package com.example.lms.identity.infrastructure.persistence.mapper;

import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.Instant;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for UserEntityMapper.
 * Verifies bidirectional mapping between User domain model and UserJpaEntity,
 * especially for the ORG_ADMIN role added in Session 43.
 */
@DisplayName("UserEntityMapper Tests")
class UserEntityMapperTest {

    private UserEntityMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new UserEntityMapper();
    }

    @Nested
    @DisplayName("toDomain Tests")
    class ToDomainTests {

        @Test
        @DisplayName("Should return null when entity is null")
        void shouldReturnNullWhenEntityIsNull() {
            assertThat(mapper.toDomain(null)).isNull();
        }

        @Test
        @DisplayName("Should map all fields from JPA entity to domain")
        void shouldMapAllFieldsFromJpaEntityToDomain() {
            // Given
            UUID id = UUID.randomUUID();
            Instant now = Instant.now();
            UserJpaEntity entity = new UserJpaEntity(
                    id, "john_doe", "john@maritime.edu", "encodedPass",
                    "John Doe", UserJpaEntity.UserRole.TEACHER, true, now, null
            );

            // When
            User domain = mapper.toDomain(entity);

            // Then
            assertThat(domain).isNotNull();
            assertThat(domain.getId().value()).isEqualTo(id);
            assertThat(domain.getUsername()).isEqualTo("john@maritime.edu"); // getUsername returns email
            assertThat(domain.getEmail().getValue()).isEqualTo("john@maritime.edu");
            assertThat(domain.getPassword()).isEqualTo("encodedPass");
            assertThat(domain.getFullName()).isEqualTo("John Doe");
            assertThat(domain.getRole()).isEqualTo(Role.TEACHER);
            assertThat(domain.isEnabled()).isTrue();
            assertThat(domain.getCreatedAt()).isEqualTo(now);
        }

        @Test
        @DisplayName("Should map ORG_ADMIN role from JPA to domain")
        void shouldMapOrgAdminFromJpaToDomain() {
            // Given
            UserJpaEntity entity = new UserJpaEntity(
                    UUID.randomUUID(), "orgadmin", "orgadmin@maritime.edu", "pass",
                    "Org Admin", UserJpaEntity.UserRole.ORG_ADMIN, true, Instant.now(), null
            );

            // When
            User domain = mapper.toDomain(entity);

            // Then
            assertThat(domain.getRole()).isEqualTo(Role.ORG_ADMIN);
            assertThat(domain.isOrgAdmin()).isTrue();
            assertThat(domain.isAdmin()).isTrue();
            assertThat(domain.isSystemAdmin()).isFalse();
        }

        @Test
        @DisplayName("Should default to STUDENT when JPA role is null")
        void shouldDefaultToStudentWhenJpaRoleIsNull() {
            // Given
            UserJpaEntity entity = new UserJpaEntity(
                    UUID.randomUUID(), "user", "user@test.com", "pass",
                    "User", null, true, Instant.now(), null
            );

            // When
            User domain = mapper.toDomain(entity);

            // Then
            assertThat(domain.getRole()).isEqualTo(Role.STUDENT);
        }

        @Test
        @DisplayName("Should handle disabled user (null enabled)")
        void shouldHandleNullEnabled() {
            // Given
            UserJpaEntity entity = new UserJpaEntity(
                    UUID.randomUUID(), "user", "user@test.com", "pass",
                    "User", UserJpaEntity.UserRole.STUDENT, null, Instant.now(), null
            );

            // When
            User domain = mapper.toDomain(entity);

            // Then
            assertThat(domain.isEnabled()).isFalse();
        }
    }

    @Nested
    @DisplayName("toEntity Tests")
    class ToEntityTests {

        @Test
        @DisplayName("Should return null when domain is null")
        void shouldReturnNullWhenDomainIsNull() {
            assertThat(mapper.toEntity(null)).isNull();
        }

        @Test
        @DisplayName("Should map all fields from domain to JPA entity")
        void shouldMapAllFieldsFromDomainToJpaEntity() {
            // Given
            UUID id = UUID.randomUUID();
            User domain = User.builder()
                    .id(UserId.of(id))
                    .username("john_doe")
                    .email(Email.of("john@maritime.edu"))
                    .password("encodedPass")
                    .fullName("John Doe")
                    .role(Role.TEACHER)
                    .enabled(true)
                    .createdAt(Instant.now())
                    .build();

            // When
            UserJpaEntity entity = mapper.toEntity(domain);

            // Then
            assertThat(entity).isNotNull();
            assertThat(entity.getId()).isEqualTo(id);
            assertThat(entity.getEmail()).isEqualTo("john@maritime.edu");
            assertThat(entity.getPassword()).isEqualTo("encodedPass");
            assertThat(entity.getFullName()).isEqualTo("John Doe");
            assertThat(entity.getRole()).isEqualTo(UserJpaEntity.UserRole.TEACHER);
            assertThat(entity.getEnabled()).isTrue();
        }

        @Test
        @DisplayName("Should map ORG_ADMIN role from domain to JPA")
        void shouldMapOrgAdminFromDomainToJpa() {
            // Given
            User domain = User.builder()
                    .id(UserId.generate())
                    .username("orgadmin")
                    .email(Email.of("orgadmin@maritime.edu"))
                    .password("pass")
                    .fullName("Org Admin")
                    .role(Role.ORG_ADMIN)
                    .enabled(true)
                    .build();

            // When
            UserJpaEntity entity = mapper.toEntity(domain);

            // Then
            assertThat(entity.getRole()).isEqualTo(UserJpaEntity.UserRole.ORG_ADMIN);
        }

        @Test
        @DisplayName("Should return null when domain user is null")
        void shouldReturnNullWhenDomainUserIsNull() {
            // User domain model enforces non-null role via Objects.requireNonNull
            // So null-role domain User cannot exist - verify mapper handles null domain
            assertThat(mapper.toEntity(null)).isNull();
        }
    }

    @Nested
    @DisplayName("Bidirectional Role Mapping Tests")
    class BidirectionalRoleMappingTests {

        static Stream<Arguments> allRolePairs() {
            return Stream.of(
                    Arguments.of(Role.ADMIN, UserJpaEntity.UserRole.ADMIN),
                    Arguments.of(Role.ORG_ADMIN, UserJpaEntity.UserRole.ORG_ADMIN),
                    Arguments.of(Role.TEACHER, UserJpaEntity.UserRole.TEACHER),
                    Arguments.of(Role.STUDENT, UserJpaEntity.UserRole.STUDENT)
            );
        }

        @ParameterizedTest(name = "{0} <-> {1}")
        @MethodSource("allRolePairs")
        @DisplayName("Should map role bidirectionally without data loss")
        void shouldMapRoleBidirectionally(Role domainRole, UserJpaEntity.UserRole jpaRole) {
            // Given - domain user
            User domain = User.builder()
                    .id(UserId.generate())
                    .username("user")
                    .email(Email.of("user@test.com"))
                    .password("pass")
                    .fullName("User")
                    .role(domainRole)
                    .enabled(true)
                    .build();

            // When - domain -> entity -> domain (round-trip)
            UserJpaEntity entity = mapper.toEntity(domain);
            User roundTripped = mapper.toDomain(entity);

            // Then
            assertThat(entity.getRole()).isEqualTo(jpaRole);
            assertThat(roundTripped.getRole()).isEqualTo(domainRole);
        }
    }
}
