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
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private UUID id;
        private String username;
        private String email;
        private String password;
        private String fullName;
        private UserRole role = UserRole.STUDENT;
        private Boolean enabled = true;
        private Instant createdAt = Instant.now();
        private Instant updatedAt;
        private UUID organizationId;
        private Integer tokenExpiryDays;
        private String avatarUrl;
        public Builder id(UUID id) { this.id = id; return this; }
        public Builder username(String username) { this.username = username; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder password(String password) { this.password = password; return this; }
        public Builder fullName(String fullName) { this.fullName = fullName; return this; }
        public Builder role(UserRole role) { this.role = role; return this; }
        public Builder enabled(Boolean enabled) { this.enabled = enabled; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public Builder organizationId(UUID organizationId) { this.organizationId = organizationId; return this; }
        public Builder tokenExpiryDays(Integer tokenExpiryDays) { this.tokenExpiryDays = tokenExpiryDays; return this; }
        public Builder avatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; return this; }
        public UserJpaEntity build() {
            UserJpaEntity user = new UserJpaEntity(id, username, email, password, fullName, role, enabled, createdAt, updatedAt);
            user.setOrganizationId(organizationId);
            user.setTokenExpiryDays(tokenExpiryDays);
            user.setAvatarUrl(avatarUrl);
            return user;
        }
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

    @Column(name = "organization_id")
    private UUID organizationId;

    @Column(name = "token_expiry_days")
    private Integer tokenExpiryDays;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "avatar_attachment_id")
    private UUID avatarAttachmentId;

    @Column(name = "must_change_password", nullable = false)
    private boolean mustChangePassword = false;

    // Admin-set account status. `enabled` stays the auth gate (true ⇔ ACTIVE),
    // but admins need to distinguish BLOCKED from RESTRICTED and attach a reason.
    // See V118 migration + issue #73.
    @Column(name = "account_status", nullable = false, length = 16)
    private String accountStatus = "ACTIVE";

    @Column(name = "status_reason", columnDefinition = "text")
    private String statusReason;

    @Column(name = "status_updated_at")
    private Instant statusUpdatedAt;

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

    public String getAccountStatus() { return accountStatus; }
    public void setAccountStatus(String accountStatus) { this.accountStatus = accountStatus; }

    public String getStatusReason() { return statusReason; }
    public void setStatusReason(String statusReason) { this.statusReason = statusReason; }

    public Instant getStatusUpdatedAt() { return statusUpdatedAt; }
    public void setStatusUpdatedAt(Instant statusUpdatedAt) { this.statusUpdatedAt = statusUpdatedAt; }
    
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public UUID getOrganizationId() { return organizationId; }
    public void setOrganizationId(UUID organizationId) { this.organizationId = organizationId; }

    public Integer getTokenExpiryDays() { return tokenExpiryDays; }
    public void setTokenExpiryDays(Integer tokenExpiryDays) { this.tokenExpiryDays = tokenExpiryDays; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public UUID getAvatarAttachmentId() { return avatarAttachmentId; }
    public void setAvatarAttachmentId(UUID avatarAttachmentId) { this.avatarAttachmentId = avatarAttachmentId; }

    public boolean isMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

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
