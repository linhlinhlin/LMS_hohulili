package com.example.lms.dto;

import com.example.lms.entity.User;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class UserSummaryDTO {
    private UUID id;
    private String username;
    private String email;
    private String fullName;
    private User.Role role;
    private Boolean enabled;

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
}