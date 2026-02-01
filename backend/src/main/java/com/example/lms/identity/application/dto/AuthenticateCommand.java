package com.example.lms.identity.application.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Command to authenticate a user.
 */
public record AuthenticateCommand(
    @NotBlank(message = "Email không được để trống")
    String email,

    @NotBlank(message = "Mật khẩu không được để trống")
    String password
) {}
