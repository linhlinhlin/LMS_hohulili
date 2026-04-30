package com.example.lms.course_authoring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/**
 * JPA Entity for Course persistence.
 * 
 * This entity is part of the INFRASTRUCTURE layer and should NOT be used
 * directly in domain/application layers. Use the domain model instead.
 * 
 * Following Strangler Fig pattern - this coexists with legacy Course domain model
 * while we gradually migrate.
 */
@Entity
@Table(name = "courses")
public class CourseJpaEntity {

    // Manual boilerplate
    public CourseJpaEntity() {}
    public CourseJpaEntity(UUID id, String code, String title, String description, CourseStatus status, UUID teacherId, UUID categoryId, Set<String> tags, String welcomeMessage, String courseInformation, String benefits, String introVideoUrl, UUID introVideoAssetId, Integer credits, Visibility visibility, PriceType priceType, BigDecimal price, BigDecimal salePrice, DeliveryMode deliveryMode, boolean allowOfflineDownload, DraftChangeStatus draftChangeStatus, String reviewComment, Instant reviewedAt, UUID reviewedById, Instant createdAt, Instant updatedAt) {
        this.id = id; this.code = code; this.title = title; this.description = description; this.status = status; this.teacherId = teacherId; this.categoryId = categoryId; this.tags = tags; this.welcomeMessage = welcomeMessage; this.courseInformation = courseInformation; this.benefits = benefits; this.introVideoUrl = introVideoUrl; this.introVideoAssetId = introVideoAssetId; this.credits = credits; this.visibility = visibility; this.priceType = priceType; this.price = price; this.salePrice = salePrice; this.deliveryMode = deliveryMode; this.allowOfflineDownload = allowOfflineDownload; this.draftChangeStatus = draftChangeStatus; this.reviewComment = reviewComment; this.reviewedAt = reviewedAt; this.reviewedById = reviewedById; this.createdAt = createdAt; this.updatedAt = updatedAt;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private UUID id; private String code; private String title; private String description; private CourseStatus status = CourseStatus.DRAFT; private UUID teacherId; private UUID categoryId; private Set<String> tags = new HashSet<>(); private String welcomeMessage; private String courseInformation; private String benefits; private String introVideoUrl; private UUID introVideoAssetId; private Integer credits; private Visibility visibility = Visibility.PUBLIC; private PriceType priceType = PriceType.FREE; private BigDecimal price; private BigDecimal salePrice; private DeliveryMode deliveryMode = DeliveryMode.SELF_PACED; private boolean allowOfflineDownload = true; private DraftChangeStatus draftChangeStatus = DraftChangeStatus.NONE; private String reviewComment; private Instant reviewedAt; private UUID reviewedById; private Instant createdAt = Instant.now(); private Instant updatedAt;
        public Builder id(UUID id) { this.id = id; return this; }
        public Builder code(String code) { this.code = code; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder status(CourseStatus status) { this.status = status; return this; }
        public Builder teacherId(UUID teacherId) { this.teacherId = teacherId; return this; }
        public Builder categoryId(UUID categoryId) { this.categoryId = categoryId; return this; }
        public Builder tags(Set<String> tags) { this.tags = tags; return this; }
        public Builder welcomeMessage(String welcomeMessage) { this.welcomeMessage = welcomeMessage; return this; }
        public Builder courseInformation(String courseInformation) { this.courseInformation = courseInformation; return this; }
        public Builder benefits(String benefits) { this.benefits = benefits; return this; }
        public Builder introVideoUrl(String introVideoUrl) { this.introVideoUrl = introVideoUrl; return this; }
        public Builder introVideoAssetId(UUID introVideoAssetId) { this.introVideoAssetId = introVideoAssetId; return this; }
        public Builder credits(Integer credits) { this.credits = credits; return this; }
        public Builder visibility(Visibility visibility) { this.visibility = visibility; return this; }
        public Builder priceType(PriceType priceType) { this.priceType = priceType; return this; }
        public Builder price(BigDecimal price) { this.price = price; return this; }
        public Builder salePrice(BigDecimal salePrice) { this.salePrice = salePrice; return this; }
        public Builder deliveryMode(DeliveryMode deliveryMode) { this.deliveryMode = deliveryMode; return this; }
        public Builder allowOfflineDownload(boolean allowOfflineDownload) { this.allowOfflineDownload = allowOfflineDownload; return this; }
        public Builder draftChangeStatus(DraftChangeStatus draftChangeStatus) { this.draftChangeStatus = draftChangeStatus; return this; }
        public Builder reviewComment(String reviewComment) { this.reviewComment = reviewComment; return this; }
        public Builder reviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; return this; }
        public Builder reviewedById(UUID reviewedById) { this.reviewedById = reviewedById; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public CourseJpaEntity build() { return new CourseJpaEntity(id, code, title, description, status, teacherId, categoryId, tags, welcomeMessage, courseInformation, benefits, introVideoUrl, introVideoAssetId, credits, visibility, priceType, price, salePrice, deliveryMode, allowOfflineDownload, draftChangeStatus, reviewComment, reviewedAt, reviewedById, createdAt, updatedAt); }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "code", unique = true, nullable = false, length = 64)
    private String code;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CourseStatus status = CourseStatus.DRAFT;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Column(name = "category_id")
    private UUID categoryId;

    @ElementCollection
    @CollectionTable(name = "course_embedded_tags", joinColumns = @JoinColumn(name = "course_id"))
    @Column(name = "tag_name")
    @Fetch(FetchMode.SUBSELECT)
    private Set<String> tags = new HashSet<>();

    @Column(columnDefinition = "TEXT")
    private String welcomeMessage;

    @Column(name = "course_information", columnDefinition = "TEXT")
    private String courseInformation;

    @Column(columnDefinition = "TEXT")
    private String benefits;

    @Column(name = "intro_video_url")
    private String introVideoUrl;

    @Column(name = "intro_video_asset_id")
    private UUID introVideoAssetId;

    @Column
    private Integer credits;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Visibility visibility = Visibility.PUBLIC;

    @Enumerated(EnumType.STRING)
    @Column(name = "price_type", nullable = false)
    private PriceType priceType = PriceType.FREE;

    @Column(precision = 19, scale = 2)
    private BigDecimal price;

    @Column(name = "sale_price", precision = 19, scale = 2)
    private BigDecimal salePrice;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "thumbnail_attachment_id")
    private UUID thumbnailAttachmentId;

    @Column(name = "intro_video_attachment_id")
    private UUID introVideoAttachmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_mode", nullable = false)
    private DeliveryMode deliveryMode = DeliveryMode.SELF_PACED;

    @Column(name = "allow_offline_download", nullable = false)
    private boolean allowOfflineDownload = true;

    @Column(name = "content_version", nullable = false)
    private int contentVersion = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "draft_change_status", nullable = false)
    private DraftChangeStatus draftChangeStatus = DraftChangeStatus.NONE;

    @Column(name = "review_comment", columnDefinition = "TEXT")
    private String reviewComment;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "reviewed_by_id")
    private UUID reviewedById;

    @Column(name = "pending_release_notes", columnDefinition = "TEXT")
    private String pendingReleaseNotes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    // Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public CourseStatus getStatus() { return status; }
    public void setStatus(CourseStatus status) { this.status = status; }
    public UUID getTeacherId() { return teacherId; }
    public void setTeacherId(UUID teacherId) { this.teacherId = teacherId; }
    public UUID getCategoryId() { return categoryId; }
    public void setCategoryId(UUID categoryId) { this.categoryId = categoryId; }
    public Set<String> getTags() { return tags; }
    public void setTags(Set<String> tags) { this.tags = tags; }
    public String getWelcomeMessage() { return welcomeMessage; }
    public void setWelcomeMessage(String welcomeMessage) { this.welcomeMessage = welcomeMessage; }
    public String getCourseInformation() { return courseInformation; }
    public void setCourseInformation(String courseInformation) { this.courseInformation = courseInformation; }
    public String getBenefits() { return benefits; }
    public void setBenefits(String benefits) { this.benefits = benefits; }
    public String getIntroVideoUrl() { return introVideoUrl; }
    public void setIntroVideoUrl(String introVideoUrl) { this.introVideoUrl = introVideoUrl; }
    public UUID getIntroVideoAssetId() { return introVideoAssetId; }
    public void setIntroVideoAssetId(UUID introVideoAssetId) { this.introVideoAssetId = introVideoAssetId; }
    public Integer getCredits() { return credits; }
    public void setCredits(Integer credits) { this.credits = credits; }
    public Visibility getVisibility() { return visibility; }
    public void setVisibility(Visibility visibility) { this.visibility = visibility; }
    public PriceType getPriceType() { return priceType; }
    public void setPriceType(PriceType priceType) { this.priceType = priceType; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }
    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }
    public UUID getThumbnailAttachmentId() { return thumbnailAttachmentId; }
    public void setThumbnailAttachmentId(UUID thumbnailAttachmentId) { this.thumbnailAttachmentId = thumbnailAttachmentId; }
    public UUID getIntroVideoAttachmentId() { return introVideoAttachmentId; }
    public void setIntroVideoAttachmentId(UUID introVideoAttachmentId) { this.introVideoAttachmentId = introVideoAttachmentId; }
    public DeliveryMode getDeliveryMode() { return deliveryMode; }
    public void setDeliveryMode(DeliveryMode deliveryMode) { this.deliveryMode = deliveryMode; }
    public boolean isAllowOfflineDownload() { return allowOfflineDownload; }
    public void setAllowOfflineDownload(boolean allowOfflineDownload) { this.allowOfflineDownload = allowOfflineDownload; }
    public int getContentVersion() { return contentVersion; }
    public void setContentVersion(int contentVersion) { this.contentVersion = contentVersion; }
    public void incrementContentVersion() { this.contentVersion++; }
    public DraftChangeStatus getDraftChangeStatus() { return draftChangeStatus; }
    public void setDraftChangeStatus(DraftChangeStatus draftChangeStatus) { this.draftChangeStatus = draftChangeStatus; }
    public String getReviewComment() { return reviewComment; }
    public void setReviewComment(String reviewComment) { this.reviewComment = reviewComment; }
    public Instant getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }
    public UUID getReviewedById() { return reviewedById; }
    public void setReviewedById(UUID reviewedById) { this.reviewedById = reviewedById; }
    public String getPendingReleaseNotes() { return pendingReleaseNotes; }
    public void setPendingReleaseNotes(String pendingReleaseNotes) { this.pendingReleaseNotes = pendingReleaseNotes; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CourseJpaEntity that = (CourseJpaEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    // ==================== Enums ====================

    public enum CourseStatus {
        DRAFT("Bản nháp"),
        PENDING("Chờ duyệt"),
        APPROVED("Đã duyệt"),
        REJECTED("Bị từ chối");

        private final String displayName;

        CourseStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    public enum Visibility {
        PUBLIC("Công khai"),
        PRIVATE("Riêng tư");

        private final String displayName;

        Visibility(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    public enum PriceType {
        FREE("Miễn phí"),
        PAID("Trả phí");

        private final String displayName;

        PriceType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    public enum DeliveryMode {
        SELF_PACED("Khóa học tự học"),
        INSTRUCTOR_LED("Lớp học có giảng viên");

        private final String displayName;

        DeliveryMode(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    public enum DraftChangeStatus {
        NONE,
        DRAFT,
        PENDING_REVIEW,
        CHANGES_REQUESTED
    }
}
