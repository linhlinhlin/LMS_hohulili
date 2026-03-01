package com.example.lms.identity.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "organization_invites")
public class OrganizationInviteJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private InviteType type;

    @Column(unique = true, length = 12)
    private String code;

    @Column(length = 255)
    private String email;

    @Column(name = "token_hash", length = 128)
    private String tokenHash;

    @Column(name = "max_uses")
    private Integer maxUses;

    @Column(name = "use_count", nullable = false)
    private int useCount = 0;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private InviteStatus status = InviteStatus.ACTIVE;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Version
    @Column(nullable = false)
    private int version = 0;

    public OrganizationInviteJpaEntity() {}

    // Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getOrganizationId() { return organizationId; }
    public void setOrganizationId(UUID organizationId) { this.organizationId = organizationId; }

    public InviteType getType() { return type; }
    public void setType(InviteType type) { this.type = type; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }

    public Integer getMaxUses() { return maxUses; }
    public void setMaxUses(Integer maxUses) { this.maxUses = maxUses; }

    public int getUseCount() { return useCount; }
    public void setUseCount(int useCount) { this.useCount = useCount; }

    public InviteStatus getStatus() { return status; }
    public void setStatus(InviteStatus status) { this.status = status; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public enum InviteType { CODE, EMAIL }
    public enum InviteStatus { ACTIVE, REVOKED, EXPIRED }
}
