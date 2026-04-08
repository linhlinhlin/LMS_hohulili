package com.example.lms.communication.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "announcement_reads")
@IdClass(AnnouncementReadJpaEntity.AnnouncementReadId.class)
public class AnnouncementReadJpaEntity {

    @Id
    @Column(name = "announcement_id")
    private UUID announcementId;

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "read_at", nullable = false)
    private Instant readAt = Instant.now();

    public AnnouncementReadJpaEntity() {}

    public AnnouncementReadJpaEntity(UUID announcementId, UUID userId) {
        this.announcementId = announcementId;
        this.userId = userId;
        this.readAt = Instant.now();
    }

    public UUID getAnnouncementId() { return announcementId; }
    public UUID getUserId() { return userId; }
    public Instant getReadAt() { return readAt; }

    public static class AnnouncementReadId implements Serializable {
        private UUID announcementId;
        private UUID userId;

        public AnnouncementReadId() {}
        public AnnouncementReadId(UUID announcementId, UUID userId) {
            this.announcementId = announcementId;
            this.userId = userId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            AnnouncementReadId that = (AnnouncementReadId) o;
            return Objects.equals(announcementId, that.announcementId) && Objects.equals(userId, that.userId);
        }

        @Override
        public int hashCode() { return Objects.hash(announcementId, userId); }
    }
}
