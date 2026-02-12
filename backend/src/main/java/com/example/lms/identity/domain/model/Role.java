package com.example.lms.identity.domain.model;

/**
 * User role enum with display names.
 */
public enum Role {
    ADMIN("Quản trị hệ thống"),
    ORG_ADMIN("Chuyên viên quản lý"),
    TEACHER("Giảng viên"),
    STUDENT("Học viên");

    private final String displayName;

    Role(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
