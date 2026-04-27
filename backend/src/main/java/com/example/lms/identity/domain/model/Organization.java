package com.example.lms.identity.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Organization domain model.
 * Pure POJO — no JPA annotations.
 */
public class Organization {

    private UUID id;
    private String name;
    private String code;
    private String description;
    private boolean enabled;
    private int tokenExpiryDays;
    private OrganizationType type;
    private boolean isDefault;
    private Instant createdAt;
    private Instant updatedAt;

    private Organization() {}

    public Organization(UUID id, String name, String code, String description,
                        boolean enabled, int tokenExpiryDays,
                        OrganizationType type, boolean isDefault,
                        Instant createdAt, Instant updatedAt) {
        this.id = Objects.requireNonNull(id);
        this.name = Objects.requireNonNull(name, "Tên tổ chức không được null");
        this.code = Objects.requireNonNull(code, "Mã tổ chức không được null");
        this.description = description;
        this.enabled = enabled;
        this.tokenExpiryDays = tokenExpiryDays;
        this.type = type != null ? type : OrganizationType.PARTNER;
        this.isDefault = isDefault;
        this.createdAt = createdAt != null ? createdAt : Instant.now();
        this.updatedAt = updatedAt;
    }

    /**
     * Issue #231: backward-compat constructor cho call sites cũ chưa biết
     * về OrganizationType. Defaults type=PARTNER, isDefault=false.
     */
    public Organization(UUID id, String name, String code, String description,
                        boolean enabled, int tokenExpiryDays,
                        Instant createdAt, Instant updatedAt) {
        this(id, name, code, description, enabled, tokenExpiryDays,
             OrganizationType.PARTNER, false, createdAt, updatedAt);
    }

    public static Organization create(String name, String code, String description, int tokenExpiryDays) {
        return create(name, code, description, tokenExpiryDays, OrganizationType.PARTNER);
    }

    /** Issue #254 (Phase 4): factory với type explicit cho admin create flow. */
    public static Organization create(String name, String code, String description,
                                       int tokenExpiryDays, OrganizationType type) {
        if (tokenExpiryDays < 7 || tokenExpiryDays > 1095) {
            throw new IllegalArgumentException("Token expiry days phải từ 7 đến 1095");
        }
        return new Organization(
            UUID.randomUUID(), name, code.toUpperCase(), description,
            true, tokenExpiryDays,
            type != null ? type : OrganizationType.PARTNER, false,
            Instant.now(), null
        );
    }

    public void update(String name, String description, int tokenExpiryDays) {
        if (tokenExpiryDays < 7 || tokenExpiryDays > 1095) {
            throw new IllegalArgumentException("Token expiry days phải từ 7 đến 1095");
        }
        this.name = Objects.requireNonNull(name);
        this.description = description;
        this.tokenExpiryDays = tokenExpiryDays;
        this.updatedAt = Instant.now();
    }

    public void disable() {
        this.enabled = false;
        this.updatedAt = Instant.now();
    }

    public void enable() {
        this.enabled = true;
        this.updatedAt = Instant.now();
    }

    public void validateMemberTokenExpiry(Integer days) {
        if (days != null && (days < 1 || days > this.tokenExpiryDays)) {
            throw new IllegalArgumentException(
                "Token expiry cho thành viên phải từ 1 đến " + this.tokenExpiryDays + " ngày");
        }
    }

    /** Issue #231: phân biệt PLATFORM org (system) vs PARTNER (external). */
    public boolean isPlatform() {
        return type == OrganizationType.PLATFORM;
    }

    // Getters
    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getCode() { return code; }
    public String getDescription() { return description; }
    public boolean isEnabled() { return enabled; }
    public int getTokenExpiryDays() { return tokenExpiryDays; }
    public OrganizationType getType() { return type; }
    public boolean isDefault() { return isDefault; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Organization that = (Organization) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() { return Objects.hash(id); }
}
