package com.example.lms.dto;

import com.example.lms.entity.User;
import java.util.UUID;

public class UserSummaryDTO {
    private UUID id;
    private String username;
    private String email;
    private String fullName;
    private User.Role role;
    private Boolean enabled;

    public UserSummaryDTO() {}

    public UserSummaryDTO(UUID id, String username, String email, String fullName, User.Role role, Boolean enabled) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.enabled = enabled;
    }

    public static UserSummaryDTO fromEntity(User user) {
        return UserSummaryDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .enabled(user.getEnabled())
                .build();
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public User.Role getRole() { return role; }
    public void setRole(User.Role role) { this.role = role; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    // Builder
    public static UserSummaryDTOBuilder builder() { return new UserSummaryDTOBuilder(); }
    public static class UserSummaryDTOBuilder {
        private UserSummaryDTO dto = new UserSummaryDTO();
        public UserSummaryDTOBuilder id(UUID id) { dto.setId(id); return this; }
        public UserSummaryDTOBuilder username(String u) { dto.setUsername(u); return this; }
        public UserSummaryDTOBuilder email(String e) { dto.setEmail(e); return this; }
        public UserSummaryDTOBuilder fullName(String f) { dto.setFullName(f); return this; }
        public UserSummaryDTOBuilder role(User.Role r) { dto.setRole(r); return this; }
        public UserSummaryDTOBuilder enabled(Boolean e) { dto.setEnabled(e); return this; }
        public UserSummaryDTO build() { return dto; }
    }
}