package com.example.lms.identity.domain.model;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;

/**
 * OrganizationInvite domain model.
 * Two types: CODE (bulk, shareable) and EMAIL (personal, hashed token).
 * Pure POJO — no JPA annotations.
 */
public class OrganizationInvite {

    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1
    private static final int CODE_LENGTH = 8;
    private static final SecureRandom RANDOM = new SecureRandom();

    private UUID id;
    private UUID organizationId;
    private InviteType type;
    private String code;         // Only for CODE type
    private String email;        // Only for EMAIL type
    private String tokenHash;    // SHA-256 hash, only for EMAIL type
    private Integer maxUses;     // null = unlimited
    private int useCount;
    private InviteStatus status;
    private Instant expiresAt;
    private UUID createdBy;
    private Instant createdAt;
    private int version;         // Optimistic locking

    private OrganizationInvite() {}

    // Full constructor for reconstitution from persistence
    public OrganizationInvite(UUID id, UUID organizationId, InviteType type,
                               String code, String email, String tokenHash,
                               Integer maxUses, int useCount, InviteStatus status,
                               Instant expiresAt, UUID createdBy, Instant createdAt,
                               int version) {
        this.id = id;
        this.organizationId = organizationId;
        this.type = type;
        this.code = code;
        this.email = email;
        this.tokenHash = tokenHash;
        this.maxUses = maxUses;
        this.useCount = useCount;
        this.status = status;
        this.expiresAt = expiresAt;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.version = version;
    }

    // Factory: Create invite code (bulk, shareable)
    public static OrganizationInvite createCode(UUID organizationId, Integer maxUses,
                                                 int expiryDays, UUID createdBy) {
        if (expiryDays < 1 || expiryDays > 365) {
            throw new IllegalArgumentException("Thời hạn mã mời phải từ 1-365 ngày");
        }
        return new OrganizationInvite(
            UUID.randomUUID(), organizationId, InviteType.CODE,
            generateCode(), null, null,
            maxUses, 0, InviteStatus.ACTIVE,
            Instant.now().plus(expiryDays, ChronoUnit.DAYS),
            createdBy, Instant.now(), 0
        );
    }

    // Factory: Create email invite (personal, single-use)
    public static OrganizationInvite createEmailInvite(UUID organizationId, String email,
                                                        String tokenHash, int expiryDays,
                                                        UUID createdBy) {
        if (expiryDays < 1 || expiryDays > 30) {
            throw new IllegalArgumentException("Thời hạn lời mời email phải từ 1-30 ngày");
        }
        Objects.requireNonNull(email, "Email không được null");
        Objects.requireNonNull(tokenHash, "Token hash không được null");
        return new OrganizationInvite(
            UUID.randomUUID(), organizationId, InviteType.EMAIL,
            null, email.toLowerCase().trim(), tokenHash,
            1, 0, InviteStatus.ACTIVE, // Email invite = single use
            Instant.now().plus(expiryDays, ChronoUnit.DAYS),
            createdBy, Instant.now(), 0
        );
    }

    // Business methods

    public boolean isValid() {
        return status == InviteStatus.ACTIVE
            && Instant.now().isBefore(expiresAt)
            && (maxUses == null || useCount < maxUses);
    }

    public void recordUse() {
        if (!isValid()) {
            throw new IllegalStateException("Mã mời không hợp lệ hoặc đã hết hạn");
        }
        this.useCount++;
        // Auto-close if max uses reached
        if (maxUses != null && useCount >= maxUses) {
            this.status = InviteStatus.EXPIRED;
        }
    }

    public void revoke() {
        if (this.status != InviteStatus.ACTIVE) {
            throw new IllegalStateException("Chỉ có thể thu hồi mã mời đang hoạt động");
        }
        this.status = InviteStatus.REVOKED;
    }

    public void markExpired() {
        if (this.status == InviteStatus.ACTIVE) {
            this.status = InviteStatus.EXPIRED;
        }
    }

    private static String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public InviteType getType() { return type; }
    public String getCode() { return code; }
    public String getEmail() { return email; }
    public String getTokenHash() { return tokenHash; }
    public Integer getMaxUses() { return maxUses; }
    public int getUseCount() { return useCount; }
    public InviteStatus getStatus() { return status; }
    public Instant getExpiresAt() { return expiresAt; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public int getVersion() { return version; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        OrganizationInvite that = (OrganizationInvite) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() { return Objects.hash(id); }

    // Enums
    public enum InviteType { CODE, EMAIL }
    public enum InviteStatus { ACTIVE, REVOKED, EXPIRED }
}
