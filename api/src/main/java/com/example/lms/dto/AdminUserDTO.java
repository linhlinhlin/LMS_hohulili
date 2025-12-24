package com.example.lms.dto;

import com.example.lms.entity.User;
import java.time.Instant;
import java.util.UUID;

/**
 * DTO for Admin User Management with aggregated data
 * Following SOTA patterns from Coursera/Udemy admin dashboards
 */
public class AdminUserDTO {
    private UUID id;
    private String username;
    private String email;
    private String fullName;
    private String role;
    private Boolean enabled;
    private String accountStatus;
    private String statusReason;
    private Instant lastLogin;
    private Integer loginCount;
    private Instant createdAt;
    private Instant updatedAt;
    
    // Aggregated data
    private Integer coursesCreated;    // For teachers: count of courses they own
    private Integer coursesCooped;     // For teachers: count of courses they are invited as teaching staff
    private Integer coursesEnrolled;   // For students: count of enrolled courses

    // Private constructor - use builder
    private AdminUserDTO() {}

    public static AdminUserDTOBuilder builder() {
        return new AdminUserDTOBuilder();
    }

    // Factory method from User entity
    public static AdminUserDTO fromUser(User user) {
        return AdminUserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .enabled(user.getEnabled())
                .accountStatus(user.getAccountStatus() != null ? user.getAccountStatus().name() : "ACTIVE")
                .statusReason(user.getStatusReason())
                .lastLogin(user.getLastLogin())
                .loginCount(user.getLoginCount())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .coursesCreated(0)
                .coursesCooped(0)
                .coursesEnrolled(0)
                .build();
    }

    // Builder class
    public static class AdminUserDTOBuilder {
        private final AdminUserDTO dto = new AdminUserDTO();

        public AdminUserDTOBuilder id(UUID id) { dto.id = id; return this; }
        public AdminUserDTOBuilder username(String username) { dto.username = username; return this; }
        public AdminUserDTOBuilder email(String email) { dto.email = email; return this; }
        public AdminUserDTOBuilder fullName(String fullName) { dto.fullName = fullName; return this; }
        public AdminUserDTOBuilder role(String role) { dto.role = role; return this; }
        public AdminUserDTOBuilder enabled(Boolean enabled) { dto.enabled = enabled; return this; }
        public AdminUserDTOBuilder accountStatus(String accountStatus) { dto.accountStatus = accountStatus; return this; }
        public AdminUserDTOBuilder statusReason(String statusReason) { dto.statusReason = statusReason; return this; }
        public AdminUserDTOBuilder lastLogin(Instant lastLogin) { dto.lastLogin = lastLogin; return this; }
        public AdminUserDTOBuilder loginCount(Integer loginCount) { dto.loginCount = loginCount; return this; }
        public AdminUserDTOBuilder createdAt(Instant createdAt) { dto.createdAt = createdAt; return this; }
        public AdminUserDTOBuilder updatedAt(Instant updatedAt) { dto.updatedAt = updatedAt; return this; }
        public AdminUserDTOBuilder coursesCreated(Integer coursesCreated) { dto.coursesCreated = coursesCreated; return this; }
        public AdminUserDTOBuilder coursesCooped(Integer coursesCooped) { dto.coursesCooped = coursesCooped; return this; }
        public AdminUserDTOBuilder coursesEnrolled(Integer coursesEnrolled) { dto.coursesEnrolled = coursesEnrolled; return this; }
        
        public AdminUserDTO build() { return dto; }
    }

    // Getters
    public UUID getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public String getRole() { return role; }
    public Boolean getEnabled() { return enabled; }
    public String getAccountStatus() { return accountStatus; }
    public String getStatusReason() { return statusReason; }
    public Instant getLastLogin() { return lastLogin; }
    public Integer getLoginCount() { return loginCount; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Integer getCoursesCreated() { return coursesCreated; }
    public Integer getCoursesCooped() { return coursesCooped; }
    public Integer getCoursesEnrolled() { return coursesEnrolled; }

    // Setters for aggregated data
    public void setCoursesCreated(Integer coursesCreated) { this.coursesCreated = coursesCreated; }
    public void setCoursesCooped(Integer coursesCooped) { this.coursesCooped = coursesCooped; }
    public void setCoursesEnrolled(Integer coursesEnrolled) { this.coursesEnrolled = coursesEnrolled; }
}

