package com.example.lms.identity.application.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

/**
 * Command to send an email invitation to join an organization.
 */
public record SendEmailInviteCommand(
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    String email,

    @Min(value = 1, message = "Thời hạn phải ít nhất 1 ngày")
    @Max(value = 30, message = "Thời hạn không quá 30 ngày")
    int expiryDays
) {
    public SendEmailInviteCommand {
        if (expiryDays == 0) expiryDays = 7; // Default 7 days for email
    }
}
