package com.example.lms.learning_delivery.application.dto;

import java.util.List;

/**
 * Response DTO for batch enrolling paid students into a class.
 */
public record BatchEnrollPaidResult(
        int enrolledCount,
        int skippedCount,
        List<String> skippedReasons,
        String message
) {
    public static BatchEnrollPaidResult success(int count, String className) {
        return new BatchEnrollPaidResult(
                count,
                0,
                List.of(),
                "Đã xếp " + count + " học viên vào " + className
        );
    }

    public static BatchEnrollPaidResult partial(int enrolled, int skipped, List<String> reasons, String className) {
        return new BatchEnrollPaidResult(
                enrolled,
                skipped,
                reasons,
                "Đã xếp " + enrolled + " học viên vào " + className + ", " + skipped + " bị bỏ qua"
        );
    }
}
