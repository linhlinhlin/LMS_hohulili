package com.example.lms.identity.application.dto;

public record VerifiedGoogleIdentity(
        String subject,
        String email,
        boolean emailVerified,
        String fullName,
        String avatarUrl
) {}
