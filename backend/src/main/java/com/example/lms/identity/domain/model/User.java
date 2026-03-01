package com.example.lms.identity.domain.model;

import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * User Domain Model - Pure POJO without JPA annotations.
 * Contains business logic and validation.
 */
public class User {
    
    private UserId id;
    private String username;
    private Email email;
    private String password;
    private String fullName;
    private Role role;
    private boolean enabled;
    private UUID organizationId;
    private Integer tokenExpiryDays;
    private Instant createdAt;
    private Instant updatedAt;
    
    // Private constructor - use builder or factory methods
    private User() {}
    
    public User(UserId id, String username, Email email, String password,
                String fullName, Role role, boolean enabled, UUID organizationId,
                Instant createdAt, Instant updatedAt) {
        this.id = Objects.requireNonNull(id, "ID người dùng không được null");
        this.username = Objects.requireNonNull(username, "Tên đăng nhập không được null");
        this.email = Objects.requireNonNull(email, "Email không được null");
        this.password = Objects.requireNonNull(password, "Mật khẩu không được null");
        this.fullName = Objects.requireNonNull(fullName, "Họ tên không được null");
        this.role = Objects.requireNonNull(role, "Vai trò không được null");
        this.enabled = enabled;
        this.organizationId = organizationId;
        this.createdAt = createdAt != null ? createdAt : Instant.now();
        this.updatedAt = updatedAt;
    }
    
    // Factory method for new user registration
    public static User createNew(String username, Email email, String encodedPassword,
                                  String fullName, Role role) {
        return new User(
            UserId.generate(),
            username,
            email,
            encodedPassword,
            fullName,
            role,
            true,
            null,
            Instant.now(),
            null
        );
    }
    
    // Business methods
    public void updateProfile(String fullName, Email email) {
        this.fullName = Objects.requireNonNull(fullName, "Họ tên không được null");
        this.email = Objects.requireNonNull(email, "Email không được null");
        this.updatedAt = Instant.now();
    }
    
    public void changePassword(String newEncodedPassword) {
        this.password = Objects.requireNonNull(newEncodedPassword, "Mật khẩu không được null");
        this.updatedAt = Instant.now();
    }
    
    public void disable() {
        this.enabled = false;
        this.updatedAt = Instant.now();
    }
    
    public void enable() {
        this.enabled = true;
        this.updatedAt = Instant.now();
    }
    
    public void changeRole(Role newRole) {
        this.role = Objects.requireNonNull(newRole, "Vai trò không được null");
        this.updatedAt = Instant.now();
    }
    
    public boolean isTeacher() {
        return role == Role.TEACHER || role == Role.ADMIN || role == Role.ORG_ADMIN;
    }

    public boolean isStudent() {
        return role == Role.STUDENT;
    }

    public boolean isAdmin() {
        return role == Role.ADMIN || role == Role.ORG_ADMIN;
    }

    public boolean isSystemAdmin() {
        return role == Role.ADMIN;
    }

    public boolean isOrgAdmin() {
        return role == Role.ORG_ADMIN;
    }

    public void assignToOrganization(UUID orgId) {
        this.organizationId = Objects.requireNonNull(orgId, "Organization ID không được null");
        this.updatedAt = Instant.now();
    }
    
    // Getters
    public UserId getId() { return id; }
    public String getUsername() { return username; }
    public Email getEmail() { return email; }
    public String getPassword() { return password; }
    public String getFullName() { return fullName; }
    public Role getRole() { return role; }
    public boolean isEnabled() { return enabled; }
    public UUID getOrganizationId() { return organizationId; }
    public Integer getTokenExpiryDays() { return tokenExpiryDays; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setTokenExpiryDays(Integer days) {
        this.tokenExpiryDays = days;
        this.updatedAt = Instant.now();
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
    
    // Builder
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private UserId id;
        private String username;
        private Email email;
        private String password;
        private String fullName;
        private Role role = Role.STUDENT;
        private boolean enabled = true;
        private UUID organizationId;
        private Integer tokenExpiryDays;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(UserId id) { this.id = id; return this; }
        public Builder username(String username) { this.username = username; return this; }
        public Builder email(Email email) { this.email = email; return this; }
        public Builder password(String password) { this.password = password; return this; }
        public Builder fullName(String fullName) { this.fullName = fullName; return this; }
        public Builder role(Role role) { this.role = role; return this; }
        public Builder enabled(boolean enabled) { this.enabled = enabled; return this; }
        public Builder organizationId(UUID organizationId) { this.organizationId = organizationId; return this; }
        public Builder tokenExpiryDays(Integer tokenExpiryDays) { this.tokenExpiryDays = tokenExpiryDays; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }

        public User build() {
            User user = new User(id, username, email, password, fullName, role, enabled, organizationId, createdAt, updatedAt);
            user.tokenExpiryDays = this.tokenExpiryDays;
            return user;
        }
    }
}
