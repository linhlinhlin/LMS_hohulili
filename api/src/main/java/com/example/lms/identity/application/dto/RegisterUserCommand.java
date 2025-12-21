package com.example.lms.identity.application.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Command to register a new user.
 */
public record RegisterUserCommand(
    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3-50 ký tự")
    String username,

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    String email,

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
    String password,

    @NotBlank(message = "Họ tên không được để trống")
    String fullName,

    String role // Optional, defaults to STUDENT
) {}
