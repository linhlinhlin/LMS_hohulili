package com.example.lms.dto;

public record ImportFailure(
    String email,
    String reason,
    int rowNumber
) {}
