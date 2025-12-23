package com.example.lms.dto;

import java.util.List;

public record ImportSummary(
    List<ImportSuccess> successes,
    List<ImportFailure> failures
) {}
