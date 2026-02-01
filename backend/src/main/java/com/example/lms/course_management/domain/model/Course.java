package com.example.lms.course_management.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Course aggregate root for Course Management bounded context.
 * 
 * DDD PURE DOMAIN MODEL:
 * - NO JPA annotations (framework-free)
 * - Contains only business logic and domain rules
 * - References to other aggregates by ID only (teacherId, categoryId)
 * 
 * Infrastructure layer (JPA entities) handles persistence mapping.
 */
public class Course {

    private UUID id;
    private String code;
    private String title;
    private String slug;
    private String description;
    private String thumbnailUrl;
    private UUID teacherId;
    private UUID categoryId;
    private BigDecimal price;
    private CoursePriceType priceType;
    private UUID prerequisiteCourseId;
    private CourseUnlockMode unlockMode;
    private CourseStatus status = CourseStatus.DRAFT;
    private List<Chapter> chapters = new ArrayList<>();
    private Instant createdAt;
    private Instant updatedAt;

    // Protected constructor for domain use
    protected Course() {}

    // ============ FACTORY METHODS (DDD Pattern) ============
    
    /**
     * Create new Course aggregate (factory method)
     */
    public static Course create(String code, String title, UUID teacherId) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Course code is required");
        }
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Course title is required");
        }
        if (teacherId == null) {
            throw new IllegalArgumentException("Teacher ID is required");
        }
        
        Course course = new Course();
        course.id = UUID.randomUUID();
        course.code = code;
        course.title = title;
        course.teacherId = teacherId;
        course.status = CourseStatus.DRAFT;
        course.createdAt = Instant.now();
        course.updatedAt = Instant.now();
        return course;
    }
    
    /**
     * Reconstitute Course from persistence (used by repository mappers)
     */
    public static Course reconstitute(
            UUID id,
            String code,
            String title,
            String slug,
            String description,
            String thumbnailUrl,
            UUID teacherId,
            UUID categoryId,
            BigDecimal price,
            CoursePriceType priceType,
            UUID prerequisiteCourseId,
            CourseUnlockMode unlockMode,
            CourseStatus status,
            List<Chapter> chapters,
            Instant createdAt,
            Instant updatedAt
    ) {
        Course course = new Course();
        course.id = id;
        course.code = code;
        course.title = title;
        course.slug = slug;
        course.description = description;
        course.thumbnailUrl = thumbnailUrl;
        course.teacherId = teacherId;
        course.categoryId = categoryId;
        course.price = price;
        course.priceType = priceType;
        course.prerequisiteCourseId = prerequisiteCourseId;
        course.unlockMode = unlockMode;
        course.status = status;
        course.chapters = chapters != null ? new ArrayList<>(chapters) : new ArrayList<>();
        course.createdAt = createdAt;
        course.updatedAt = updatedAt;
        return course;
    }

    // ============ DOMAIN BEHAVIOR ============

    public void addChapter(Chapter chapter) {
        if (chapter == null) {
            throw new IllegalArgumentException("Chapter cannot be null");
        }
        chapter.setCourse(this);
        this.chapters.add(chapter);
        this.updatedAt = Instant.now();
    }

    public void removeChapter(Chapter chapter) {
        if (chapter != null) {
            this.chapters.remove(chapter);
            chapter.setCourse(null);
            this.updatedAt = Instant.now();
        }
    }

    public void publish() {
        if (this.chapters.isEmpty()) {
            throw new IllegalStateException("Cannot publish an empty course");
        }
        this.status = CourseStatus.APPROVED;
        this.updatedAt = Instant.now();
    }

    public void submitForApproval() {
        if (this.status != CourseStatus.DRAFT && this.status != CourseStatus.REJECTED) {
            throw new IllegalStateException("Only Draft or Rejected courses can be submitted");
        }
        this.status = CourseStatus.PENDING;
        this.updatedAt = Instant.now();
    }

    public void cancelApproval() {
        if (this.status != CourseStatus.PENDING) {
            throw new IllegalStateException("Only Pending courses can be cancelled");
        }
        this.status = CourseStatus.DRAFT;
        this.updatedAt = Instant.now();
    }
    
    public void approve() {
        if (this.status != CourseStatus.PENDING) {
            throw new IllegalStateException("Only Pending courses can be approved");
        }
        this.status = CourseStatus.APPROVED;
        this.updatedAt = Instant.now();
    }
    
    public void reject() {
        if (this.status != CourseStatus.PENDING) {
            throw new IllegalStateException("Only Pending courses can be rejected");
        }
        this.status = CourseStatus.REJECTED;
        this.updatedAt = Instant.now();
    }
    
    public void archive() {
        this.status = CourseStatus.ARCHIVED;
        this.updatedAt = Instant.now();
    }

    // ============ GETTERS (Immutable access) ============

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public String getTitle() { return title; }
    public String getSlug() { return slug; }
    public String getDescription() { return description; }
    public String getThumbnailUrl() { return thumbnailUrl; }
    public UUID getTeacherId() { return teacherId; }
    public UUID getCategoryId() { return categoryId; }
    public BigDecimal getPrice() { return price; }
    public CoursePriceType getPriceType() { return priceType; }
    public UUID getPrerequisiteCourseId() { return prerequisiteCourseId; }
    public CourseUnlockMode getUnlockMode() { return unlockMode; }
    public CourseStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    
    public List<Chapter> getChapters() {
        return Collections.unmodifiableList(chapters);
    }

    // ============ SETTERS (Domain mutations) ============
    
    public void setId(UUID id) { this.id = id; }
    public void setCode(String code) { this.code = code; this.updatedAt = Instant.now(); }
    public void setTitle(String title) { this.title = title; this.updatedAt = Instant.now(); }
    public void setSlug(String slug) { this.slug = slug; this.updatedAt = Instant.now(); }
    public void setDescription(String description) { this.description = description; this.updatedAt = Instant.now(); }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; this.updatedAt = Instant.now(); }
    public void setTeacherId(UUID teacherId) { this.teacherId = teacherId; this.updatedAt = Instant.now(); }
    public void setCategoryId(UUID categoryId) { this.categoryId = categoryId; this.updatedAt = Instant.now(); }
    public void setPrice(BigDecimal price) { this.price = price; this.updatedAt = Instant.now(); }
    public void setPriceType(CoursePriceType priceType) { this.priceType = priceType; this.updatedAt = Instant.now(); }
    public void setPrerequisiteCourseId(UUID prerequisiteCourseId) { this.prerequisiteCourseId = prerequisiteCourseId; this.updatedAt = Instant.now(); }
    public void setUnlockMode(CourseUnlockMode unlockMode) { this.unlockMode = unlockMode; this.updatedAt = Instant.now(); }
    public void setStatus(CourseStatus status) { this.status = status; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public void setChapters(List<Chapter> chapters) { this.chapters = chapters != null ? new ArrayList<>(chapters) : new ArrayList<>(); }

    // ============ BUILDER (for convenience) ============
    
    public static CourseBuilder builder() { return new CourseBuilder(); }
    
    public static class CourseBuilder {
        private Course c = new Course();
        public CourseBuilder id(UUID id) { c.id = id; return this; }
        public CourseBuilder code(String code) { c.code = code; return this; }
        public CourseBuilder title(String title) { c.title = title; return this; }
        public CourseBuilder slug(String slug) { c.slug = slug; return this; }
        public CourseBuilder description(String d) { c.description = d; return this; }
        public CourseBuilder thumbnailUrl(String t) { c.thumbnailUrl = t; return this; }
        public CourseBuilder teacherId(UUID t) { c.teacherId = t; return this; }
        public CourseBuilder categoryId(UUID cId) { c.categoryId = cId; return this; }
        public CourseBuilder price(BigDecimal p) { c.price = p; return this; }
        public CourseBuilder priceType(CoursePriceType p) { c.priceType = p; return this; }
        public CourseBuilder prerequisiteCourseId(UUID p) { c.prerequisiteCourseId = p; return this; }
        public CourseBuilder unlockMode(CourseUnlockMode u) { c.unlockMode = u; return this; }
        public CourseBuilder status(CourseStatus s) { c.status = s; return this; }
        public CourseBuilder chapters(List<Chapter> ch) { c.chapters = ch != null ? new ArrayList<>(ch) : new ArrayList<>(); return this; }
        public CourseBuilder createdAt(Instant ct) { c.createdAt = ct; return this; }
        public CourseBuilder updatedAt(Instant ut) { c.updatedAt = ut; return this; }
        public Course build() { return c; }
    }

    // ============ VALUE OBJECTS (Enums) ============

    public enum CourseStatus {
        DRAFT, PENDING, APPROVED, REJECTED, ARCHIVED
    }

    public enum CoursePriceType {
        FREE, PAID
    }

    public enum CourseUnlockMode {
        OPEN_ALL, SEQUENTIAL
    }
}
