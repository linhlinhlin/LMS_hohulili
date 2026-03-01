package com.example.lms.identity.application.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Command to create an invite code for an organization.
 */
public record CreateInviteCodeCommand(
    Integer maxUses, // null = unlimited

    @Min(value = 1, message = "Thời hạn phải ít nhất 1 ngày")
    @Max(value = 365, message = "Thời hạn không quá 365 ngày")
    int expiryDays
) {
    public CreateInviteCodeCommand {
        if (expiryDays == 0) expiryDays = 90; // Default 90 days for maritime
    }
}
