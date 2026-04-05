package com.example.lms.identity.application.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Command to update user profile.
 */
public record UpdateProfileCommand(
    @NotNull UUID userId,

    @Size(max = 100, message = "Họ tên không được vượt quá 100 ký tự")
    String fullName,

    @Email(message = "Email không đúng định dạng")
    String email,

    @Size(max = 500, message = "URL avatar không được vượt quá 500 ký tự")
    String avatarUrl
) {}
