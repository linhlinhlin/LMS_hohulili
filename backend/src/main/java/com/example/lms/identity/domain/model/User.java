package com.example.lms.identity.domain.model;

import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;

import java.time.Instant;
import java.util.Objects;

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
    private Instant createdAt;
    private Instant updatedAt;
    
    // Private constructor - use builder or factory methods
    private User() {}
    
    public User(UserId id, String username, Email email, String password, 
                String fullName, Role role, boolean enabled, 
                Instant createdAt, Instant updatedAt) {
        this.id = Objects.requireNonNull(id, "User ID cannot be null");
        this.username = Objects.requireNonNull(username, "Username cannot be null");
        this.email = Objects.requireNonNull(email, "Email cannot be null");
        this.password = Objects.requireNonNull(password, "Password cannot be null");
        this.fullName = Objects.requireNonNull(fullName, "Full name cannot be null");
        this.role = Objects.requireNonNull(role, "Role cannot be null");
        this.enabled = enabled;
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
            Instant.now(),
            null
        );
    }
    
    // Business methods
    public void updateProfile(String fullName, Email email) {
        this.fullName = Objects.requireNonNull(fullName, "Full name cannot be null");
        this.email = Objects.requireNonNull(email, "Email cannot be null");
        this.updatedAt = Instant.now();
    }
    
    public void changePassword(String newEncodedPassword) {
        this.password = Objects.requireNonNull(newEncodedPassword, "Password cannot be null");
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
        this.role = Objects.requireNonNull(newRole, "Role cannot be null");
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
    
    // Getters
    public UserId getId() { return id; }
    public String getUsername() { return username; }
    public Email getEmail() { return email; }
    public String getPassword() { return password; }
    public String getFullName() { return fullName; }
    public Role getRole() { return role; }
    public boolean isEnabled() { return enabled; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    
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
        private Instant createdAt;
        private Instant updatedAt;
        
        public Builder id(UserId id) { this.id = id; return this; }
        public Builder username(String username) { this.username = username; return this; }
        public Builder email(Email email) { this.email = email; return this; }
        public Builder password(String password) { this.password = password; return this; }
        public Builder fullName(String fullName) { this.fullName = fullName; return this; }
        public Builder role(Role role) { this.role = role; return this; }
        public Builder enabled(boolean enabled) { this.enabled = enabled; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        
        public User build() {
            return new User(id, username, email, password, fullName, role, enabled, createdAt, updatedAt);
        }
    }
}
