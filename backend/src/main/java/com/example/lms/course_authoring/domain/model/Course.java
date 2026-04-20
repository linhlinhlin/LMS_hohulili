package com.example.lms.course_authoring.domain.model;

import com.example.lms.shared.domain.model.AggregateRoot;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.course_authoring.domain.event.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/**
 * Course aggregate root.
 * Represents a course that can be created, edited, and published by teachers.
 *
 * Lifecycle: DRAFT -> PENDING -> APPROVED/REJECTED
 * - DRAFT: Initial state, can be edited
 * - PENDING: Submitted for approval, cannot be edited
 * - APPROVED: Published and visible to students
 * - REJECTED: Needs revision, can be edited and resubmitted
 */
public class Course extends AggregateRoot {

    private CourseCode code;
    private String title;
    private String description;
    private CourseStatus status = CourseStatus.DRAFT;
    private UUID teacherId;
    private UUID categoryId;
    private Set<String> tags = new HashSet<>();
    private String welcomeMessage;
    private String courseInformation;
    private String benefits;
    private String introVideoUrl;
    private UUID introVideoAssetId;
    private String thumbnailUrl;
    private Integer credits;
    private Visibility visibility = Visibility.PUBLIC;
    private PriceType priceType = PriceType.FREE;
    private BigDecimal price;
    private BigDecimal salePrice;
    private DeliveryMode deliveryMode = DeliveryMode.SELF_PACED;
    private boolean allowOfflineDownload = true;
    private int contentVersion = 1;
    private DraftChangeStatus draftChangeStatus = DraftChangeStatus.NONE;

    // Review workflow fields
    private String reviewComment;
    private Instant reviewedAt;
    private UUID reviewedById;
    private String pendingReleaseNotes;

    private Set<Chapter> chapters = new LinkedHashSet<>();

    // Default constructor
    protected Course() {}

    // ==================== Factory Methods ====================

    /**
     * Create a new course in DRAFT status.
     */
    public static Course create(CourseCode code, String title, String description, UUID teacherId) {
        validateTitle(title);
        Objects.requireNonNull(teacherId, "Teacher ID không được để trống");
        Objects.requireNonNull(code, "Mã khóa học không được để trống");

        Course course = new Course();
        course.code = code;
        course.title = title.trim();
        course.description = description;
        course.teacherId = teacherId;
        course.status = CourseStatus.DRAFT;

        course.registerEvent(new CourseCreatedEvent(course.getId(), code.getValue(), title, teacherId));
        return course;
    }

    // ==================== Domain Behavior ====================

    /**
     * Update course basic information.
     * Only allowed when course is editable (DRAFT or REJECTED).
     */
    public void updateInfo(String title, String description) {
        ensureEditable();
        
        if (title != null && !title.isBlank()) {
            validateTitle(title);
            this.title = title.trim();
        }
        this.description = description;
        markDraftChanged();
    }

    /**
     * Update course extended information.
     */
    public void updateExtendedInfo(String welcomeMessage, String courseInformation,
                                    String benefits, String introVideoUrl, UUID introVideoAssetId, Integer credits) {
        ensureEditable();
        
        this.welcomeMessage = welcomeMessage;
        this.courseInformation = courseInformation;
        this.benefits = benefits;
        this.introVideoUrl = introVideoUrl;
        this.introVideoAssetId = introVideoAssetId;
        this.credits = credits;
        markDraftChanged();
    }

    public void updateThumbnail(String thumbnailUrl) {
        ensureEditable();
        this.thumbnailUrl = thumbnailUrl; // No validation for now
        markDraftChanged();
    }

    /**
     * Update course pricing.
     */
    public void updatePricing(PriceType priceType, BigDecimal price, BigDecimal salePrice) {
        ensureEditable();
        
        this.priceType = priceType != null ? priceType : PriceType.FREE;
        
        if (this.priceType == PriceType.PAID) {
            if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Giá khóa học phải lớn hơn 0 cho khóa học trả phí");
            }
            this.price = price;
            this.salePrice = salePrice;
        } else {
            this.price = null;
            this.salePrice = null;
        }
        markDraftChanged();
    }

    /**
     * Update course visibility.
     */
    public void updateVisibility(Visibility visibility) {
        ensureEditable();
        this.visibility = visibility != null ? visibility : Visibility.PUBLIC;
        markDraftChanged();
    }

    /**
     * Update course delivery mode.
     * SELF_PACED: Online course (Coursera-like), no class management
     * INSTRUCTOR_LED: University-style with classes, assignments, gradebook
     */
    public void updateDeliveryMode(DeliveryMode deliveryMode) {
        ensureEditable();
        this.deliveryMode = deliveryMode != null ? deliveryMode : DeliveryMode.SELF_PACED;
        markDraftChanged();
    }

    /**
     * Update whether offline download is allowed for this course.
     */
    public void updateAllowOfflineDownload(boolean value) {
        ensureEditable();
        this.allowOfflineDownload = value;
        markDraftChanged();
    }

    /**
     * Update course category.
     */
    public void updateCategory(UUID categoryId) {
        ensureEditable();
        this.categoryId = categoryId;
        markDraftChanged();
    }

    /**
     * Update course tags.
     */
    public void updateTags(Set<String> tags) {
        ensureEditable();
        this.tags.clear();
        if (tags != null) {
            this.tags.addAll(tags);
        }
        markDraftChanged();
    }

    /**
     * Submit course for approval.
     * Only allowed from DRAFT or REJECTED status.
     */
    public void submitForApproval() {
        if (status == CourseStatus.APPROVED) {
            if (draftChangeStatus != DraftChangeStatus.DRAFT
                    && draftChangeStatus != DraftChangeStatus.CHANGES_REQUESTED) {
                throw new BusinessRuleException("INVALID_STATUS",
                    "Chỉ có thể gửi duyệt bản nháp thay đổi khi khóa học đã có thay đổi chưa xuất bản");
            }

            this.draftChangeStatus = DraftChangeStatus.PENDING_REVIEW;
            clearReviewInfo();
            return;
        }

        if (status != CourseStatus.DRAFT && status != CourseStatus.REJECTED) {
            throw new BusinessRuleException("INVALID_STATUS",
                "Chỉ có thể gửi duyệt khóa học ở trạng thái Bản nháp hoặc Bị từ chối");
        }

        // Cross-aggregate chapter validation moved to application layer (use case)
        // because chapters are a separate aggregate loaded independently from DB

        this.status = CourseStatus.PENDING;
        clearReviewInfo();

        registerEvent(new CourseSubmittedForApprovalEvent(getId(), code.getValue()));
    }

    /**
     * Cancel approval request.
     * Only allowed when status is PENDING.
     */
    public void cancelApprovalRequest() {
        if (status == CourseStatus.APPROVED && draftChangeStatus == DraftChangeStatus.PENDING_REVIEW) {
            this.draftChangeStatus = DraftChangeStatus.DRAFT;
            return;
        }

        if (status != CourseStatus.PENDING) {
            throw new BusinessRuleException("INVALID_STATUS", 
                "Chỉ có thể hủy yêu cầu duyệt khi đang chờ duyệt");
        }
        
        this.status = CourseStatus.DRAFT;
    }

    /**
     * Approve the course.
     * Only allowed when status is PENDING.
     */
    public void approve(UUID reviewerId, String comment) {
        if (status == CourseStatus.APPROVED) {
            if (draftChangeStatus != DraftChangeStatus.PENDING_REVIEW) {
                throw new BusinessRuleException("INVALID_STATUS",
                    "Chỉ có thể duyệt bản nháp thay đổi đang chờ duyệt");
            }

            this.draftChangeStatus = DraftChangeStatus.NONE;
            this.reviewedById = reviewerId;
            this.reviewComment = comment;
            this.reviewedAt = Instant.now();
            return;
        }

        if (status != CourseStatus.PENDING) {
            throw new BusinessRuleException("INVALID_STATUS", 
                "Chỉ có thể duyệt khóa học đang chờ duyệt");
        }
        
        this.status = CourseStatus.APPROVED;
        this.reviewedById = reviewerId;
        this.reviewComment = comment;
        this.reviewedAt = Instant.now();
        
        registerEvent(new CourseApprovedEvent(
            com.example.lms.shared.domain.valueobject.CourseId.of(getId()),
            code.getValue(),
            title,
            com.example.lms.shared.domain.valueobject.TeacherId.of(teacherId),
            reviewerId
        ));
    }

    /**
     * Reject the course (legacy overload — no category).
     * Only allowed when status is PENDING.
     */
    public void reject(UUID reviewerId, String reason) {
        reject(reviewerId, reason, null);
    }

    /**
     * Reject the course with a structured category + free-text reason.
     * Only allowed when status is PENDING or when a pending change-set exists on APPROVED.
     */
    public void reject(UUID reviewerId, String reason, CourseRejectionCategory category) {
        if (status == CourseStatus.APPROVED) {
            if (draftChangeStatus != DraftChangeStatus.PENDING_REVIEW) {
                throw new BusinessRuleException("INVALID_STATUS",
                    "Chỉ có thể từ chối bản nháp thay đổi đang chờ duyệt");
            }

            if (reason == null || reason.isBlank()) {
                throw new IllegalArgumentException("Lý do từ chối không được để trống");
            }

            // Preserve legacy behavior: no rejection event for change-set revisions
            // (teachers are expected to monitor the draft; avoids duplicate notifications)
            this.draftChangeStatus = DraftChangeStatus.CHANGES_REQUESTED;
            this.reviewedById = reviewerId;
            this.reviewComment = reason;
            this.reviewedAt = Instant.now();
            return;
        }

        if (status != CourseStatus.PENDING) {
            throw new BusinessRuleException("INVALID_STATUS",
                "Chỉ có thể từ chối khóa học đang chờ duyệt");
        }

        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Lý do từ chối không được để trống");
        }

        this.status = CourseStatus.REJECTED;
        this.reviewedById = reviewerId;
        this.reviewComment = reason;
        this.reviewedAt = Instant.now();

        registerEvent(new CourseRejectedEvent(getId(), code.getValue(), title,
                teacherId, reviewerId, reason, category));
    }

    /**
     * Revoke course approval — move back to DRAFT.
     * Only allowed when status is APPROVED.
     */
    public void revoke(UUID reviewerId, String reason) {
        if (status != CourseStatus.APPROVED) {
            throw new BusinessRuleException("INVALID_STATUS",
                "Chỉ có thể thu hồi khóa học đã được duyệt");
        }

        this.status = CourseStatus.DRAFT;
        this.reviewedById = reviewerId;
        this.reviewComment = reason != null ? reason : "Bị thu hồi bởi quản trị viên";
        this.reviewedAt = Instant.now();
    }

    /**
     * Add a new chapter to the course.
     */
    public Chapter addChapter(String title, String description) {
        ensureEditable();
        
        int orderIndex = chapters.size();
        Chapter chapter = Chapter.create(this, title, description, orderIndex);
        chapters.add(chapter);
        return chapter;
    }

    /**
     * Remove a chapter from the course.
     */
    public void removeChapter(UUID chapterId) {
        ensureEditable();
        
        chapters.removeIf(c -> c.getId().equals(chapterId));
        reorderChapters();
    }

    /**
     * Reorder chapters.
     */
    public void reorderChapters(List<UUID> chapterIds) {
        ensureEditable();
        
        if (chapterIds.size() != chapters.size()) {
            throw new IllegalArgumentException("Số lượng chapter không khớp");
        }
        
        Map<UUID, Chapter> chapterMap = new HashMap<>();
        for (Chapter chapter : chapters) {
            chapterMap.put(chapter.getId(), chapter);
        }
        
        List<Chapter> reordered = new ArrayList<>();
        for (int i = 0; i < chapterIds.size(); i++) {
            Chapter chapter = chapterMap.get(chapterIds.get(i));
            if (chapter == null) {
                throw new IllegalArgumentException("Chapter không tồn tại: " + chapterIds.get(i));
            }
            chapter.setOrderIndex(i);
            reordered.add(chapter);
        }
        
        chapters.clear();
        chapters.addAll(reordered);
    }

    // ==================== Helper Methods ====================

    private void ensureEditable() {
        if (!isEditable()) {
            throw BusinessRuleException.courseNotEditable();
        }
    }

    public void markDraftChanged() {
        if (status == CourseStatus.APPROVED && draftChangeStatus != DraftChangeStatus.PENDING_REVIEW) {
            this.draftChangeStatus = DraftChangeStatus.DRAFT;
        }
    }

    public void incrementContentVersion() {
        this.contentVersion++;
    }

    private void clearReviewInfo() {
        this.reviewComment = null;
        this.reviewedAt = null;
        this.reviewedById = null;
    }

    private void reorderChapters() {
        List<Chapter> chapterList = new ArrayList<>(chapters);
        for (int i = 0; i < chapterList.size(); i++) {
            chapterList.get(i).setOrderIndex(i);
        }
    }

    private static void validateTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Tên khóa học không được để trống");
        }
        if (title.length() > 255) {
            throw new IllegalArgumentException("Tên khóa học không được vượt quá 255 ký tự");
        }
    }

    // ==================== Query Methods ====================

    public boolean isEditable() {
        if (status == CourseStatus.DRAFT || status == CourseStatus.REJECTED) {
            return true;
        }
        return status == CourseStatus.APPROVED && draftChangeStatus != DraftChangeStatus.PENDING_REVIEW;
    }

    public boolean isPublished() {
        return status == CourseStatus.APPROVED;
    }

    public boolean isPending() {
        return status == CourseStatus.PENDING;
    }

    public boolean isOwnedBy(UUID userId) {
        return teacherId.equals(userId);
    }

    public int getChapterCount() {
        return chapters.size();
    }

    public int getTotalLessonCount() {
        return chapters.stream()
                .mapToInt(Chapter::getLessonCount)
                .sum();
    }

    // ==================== Getters ====================

    public CourseCode getCode() { return code; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public CourseStatus getStatus() { return status; }
    public UUID getTeacherId() { return teacherId; }
    public UUID getCategoryId() { return categoryId; }
    public Set<String> getTags() { return Collections.unmodifiableSet(tags); }
    public String getWelcomeMessage() { return welcomeMessage; }
    public String getCourseInformation() { return courseInformation; }
    public String getBenefits() { return benefits; }
    public String getIntroVideoUrl() { return introVideoUrl; }
    public UUID getIntroVideoAssetId() { return introVideoAssetId; }
    public String getThumbnailUrl() { return thumbnailUrl; }
    public Integer getCredits() { return credits; }
    public Visibility getVisibility() { return visibility; }
    public PriceType getPriceType() { return priceType; }
    public BigDecimal getPrice() { return price; }
    public BigDecimal getSalePrice() { return salePrice; }
    public DeliveryMode getDeliveryMode() { return deliveryMode; }
    public boolean isAllowOfflineDownload() { return allowOfflineDownload; }
    public int getContentVersion() { return contentVersion; }
    public DraftChangeStatus getDraftChangeStatus() { return draftChangeStatus; }
    public String getReviewComment() { return reviewComment; }
    public Instant getReviewedAt() { return reviewedAt; }
    public UUID getReviewedById() { return reviewedById; }
    public String getPendingReleaseNotes() { return pendingReleaseNotes; }
    public void setPendingReleaseNotes(String pendingReleaseNotes) { this.pendingReleaseNotes = pendingReleaseNotes; }
    public Set<Chapter> getChapters() { return Collections.unmodifiableSet(chapters); }

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
