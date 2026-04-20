package com.example.lms.course_authoring.domain.model;

/**
 * Structured categories for course rejection reasons.
 * Used alongside free-text `reason` to give teachers a clear class-of-problem signal
 * and power admin-side analytics on why courses fail review.
 *
 * Design: controlled vocabulary (like Udemy's rejection reasons / Canvas's outcome taxonomy).
 * The enum is persisted as VARCHAR in course_review_events.rejection_category.
 */
public enum CourseRejectionCategory {
    INSUFFICIENT_CONTENT("Nội dung chưa đầy đủ"),
    LOW_QUALITY("Chất lượng nội dung chưa đạt"),
    INACCURATE_INFO("Thông tin chưa chính xác"),
    MISSING_MEDIA("Thiếu hình ảnh/video minh họa"),
    COPYRIGHT_VIOLATION("Vi phạm bản quyền"),
    INAPPROPRIATE_CONTENT("Nội dung không phù hợp"),
    TECHNICAL_ISSUE("Lỗi kỹ thuật trong nội dung"),
    OTHER("Lý do khác");

    private final String displayName;

    CourseRejectionCategory(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    /**
     * Parse a string into a category; returns OTHER if value is null/blank/unknown.
     * Safe for controller-layer input from untrusted clients.
     */
    public static CourseRejectionCategory fromStringOrOther(String value) {
        if (value == null || value.isBlank()) {
            return OTHER;
        }
        try {
            return CourseRejectionCategory.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return OTHER;
        }
    }
}
