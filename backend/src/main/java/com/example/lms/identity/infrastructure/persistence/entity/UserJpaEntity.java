package com.example.lms.identity.infrastructure.persistence.entity;

import jakarta.persistence.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import java.util.Objects;

/**
 * JPA Entity for User persistence.
 * 
 * This entity is part of the INFRASTRUCTURE layer and should NOT be used
 * directly in domain/application layers. Use the domain model instead.
 * 
 * Implements UserDetails for Spring Security integration.
 */
@Entity
@Table(name = "users")
public class UserJpaEntity implements UserDetails {

    // Manual Constructors
    public UserJpaEntity() {}
    public UserJpaEntity(UUID id, String username, String email, String password, String fullName, UserRole role, Boolean enabled, Instant createdAt, Instant updatedAt) {
        this.id = id; this.username = username; this.email = email; this.password = password; this.fullName = fullName; this.role = role; this.enabled = enabled; this.createdAt = createdAt; this.updatedAt = updatedAt;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(unique = true, nullable = false, length = 100)
    private String email;

    @Column(nullable = false)
    @JsonIgnore
    private String password;

    @Column(nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role = UserRole.STUDENT;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column
    private Instant updatedAt;

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    
    public void setUsername(String username) { this.username = username; }
    // getUsername() is overridden below
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    
    public UserRole getRole() { return role; }
    public void setRole(UserRole role) { this.role = role; }
    
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    // ==================== UserDetails Implementation ====================

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        String roleName = role != null ? role.name() : null;
        if (roleName == null) {
            return List.of();
        }
        if (!roleName.startsWith("ROLE_")) {
            roleName = "ROLE_" + roleName;
        }
        return List.of(new SimpleGrantedAuthority(roleName));
    }

    /**
     * Return email as the username for Spring Security.
     * This ensures JWT token validation works correctly since tokens use email as subject.
     */
    @Override
    public String getUsername() {
        return email;
    }

    /**
     * Get the actual username field value (for display purposes).
     */
    public String getDisplayName() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled != null && enabled;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserJpaEntity that = (UserJpaEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    /**
     * User role enum for JPA persistence.
     */
    public enum UserRole {
        ADMIN("Quản trị hệ thống"),
        ORG_ADMIN("Chuyên viên quản lý"),
        TEACHER("Giảng viên"),
        STUDENT("Học viên");

        private final String displayName;

        UserRole(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}
