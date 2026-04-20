package com.example.lms.identity.application.dto;

public record AuthenticateWithGoogleCommand(
        String idToken,
        String inviteCode
) {}
