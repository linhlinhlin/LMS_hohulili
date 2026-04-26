package com.example.lms.identity.domain.model;

/**
 * Issue #231 (Phase 1): Organization type enum cho multi-tenant model.
 *
 * <ul>
 *   <li>{@link #PLATFORM} — tổ chức nền tảng (HoLiLiHu Org). Là home org
 *   của system ADMIN và người dùng đăng ký cá nhân. Chỉ có 1 row PLATFORM
 *   duy nhất (enforced bằng `is_default` partial unique index ở DB).</li>
 *   <li>{@link #PARTNER} — tổ chức đối tác (trường hàng hải khác, công ty
 *   đào tạo thuyền viên, đơn vị kiểm định). ORG_ADMIN scoped tại đây.</li>
 *   <li>{@link #INTERNAL} — tổ chức nội bộ thuộc cùng tổ chức quản lý
 *   platform nhưng tách phòng ban (vd Phòng Đào tạo vs Khoa Hàng hải).
 *   Phase 2+, hiện default fallback PARTNER.</li>
 * </ul>
 */
public enum OrganizationType {
    PLATFORM,
    PARTNER,
    INTERNAL
}
