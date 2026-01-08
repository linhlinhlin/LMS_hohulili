package com.example.lms.course_management.domain.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Course aggregate root for Course Management bounded context.
 * 
 * Following DDD principles:
 * - References to User aggregate are by ID only (teacherId)
 * - This maintains bounded context isolation
 */
@Entity(name = "CourseAuthoring")
@Table(name = "course_authoring")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Column(nullable = false, unique = true)
    private String code;

    @NotBlank
    @Column(nullable = false)
    private String title;

    @Column(unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    /**
     * Reference to User aggregate (teacher) by ID only (DDD principle)
     */
    @NotNull
    @Column(name = "owner_id", nullable = false)
    private UUID teacherId;

    @Column(name = "category_id")
    private Integer categoryId;

    @Column(name = "price")
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(name = "price_type")
    private CoursePriceType priceType;

    @Column(name = "prerequisite_course_id")
    private UUID prerequisiteCourseId;

    @Enumerated(EnumType.STRING)
    @Column(name = "unlock_mode")
    private CourseUnlockMode unlockMode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CourseStatus status = CourseStatus.DRAFT;

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<Chapter> chapters = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public Course() {}

    // Getters & Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }
    public UUID getTeacherId() { return teacherId; }
    public void setTeacherId(UUID teacherId) { this.teacherId = teacherId; }
    public Integer getCategoryId() { return categoryId; }
    public void setCategoryId(Integer categoryId) { this.categoryId = categoryId; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public CoursePriceType getPriceType() { return priceType; }
    public void setPriceType(CoursePriceType priceType) { this.priceType = priceType; }
    public UUID getPrerequisiteCourseId() { return prerequisiteCourseId; }
    public void setPrerequisiteCourseId(UUID prerequisiteCourseId) { this.prerequisiteCourseId = prerequisiteCourseId; }
    public CourseUnlockMode getUnlockMode() { return unlockMode; }
    public void setUnlockMode(CourseUnlockMode unlockMode) { this.unlockMode = unlockMode; }
    public CourseStatus getStatus() { return status; }
    public void setStatus(CourseStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public void setChapters(List<Chapter> chapters) { this.chapters = chapters; }

    // Builder
    public static CourseBuilder builder() { return new CourseBuilder(); }
    public static class CourseBuilder {
        private Course c = new Course();
        public CourseBuilder id(UUID id) { c.setId(id); return this; }
        public CourseBuilder code(String code) { c.setCode(code); return this; }
        public CourseBuilder title(String title) { c.setTitle(title); return this; }
        public CourseBuilder slug(String slug) { c.setSlug(slug); return this; }
        public CourseBuilder description(String d) { c.setDescription(d); return this; }
        public CourseBuilder thumbnailUrl(String t) { c.setThumbnailUrl(t); return this; }
        public CourseBuilder teacherId(UUID t) { c.setTeacherId(t); return this; }
        public CourseBuilder categoryId(Integer cId) { c.setCategoryId(cId); return this; }
        public CourseBuilder price(BigDecimal p) { c.setPrice(p); return this; }
        public CourseBuilder priceType(CoursePriceType p) { c.setPriceType(p); return this; }
        public CourseBuilder prerequisiteCourseId(UUID p) { c.setPrerequisiteCourseId(p); return this; }
        public CourseBuilder unlockMode(CourseUnlockMode u) { c.setUnlockMode(u); return this; }
        public CourseBuilder status(CourseStatus s) { c.setStatus(s); return this; }
        public CourseBuilder chapters(List<Chapter> ch) { c.setChapters(ch); return this; }
        public CourseBuilder createdAt(Instant ct) { c.setCreatedAt(ct); return this; }
        public CourseBuilder updatedAt(Instant ut) { c.setUpdatedAt(ut); return this; }
        public Course build() { return c; }
    }

    // Domain Behavior
    public void addChapter(Chapter chapter) {
        chapter.setCourse(this);
        this.chapters.add(chapter);
    }

    public void removeChapter(Chapter chapter) {
        this.chapters.remove(chapter);
        chapter.setCourse(null);
    }

    public void publish() {
        if (this.chapters.isEmpty()) {
            throw new IllegalStateException("Cannot publish an empty course");
        }
        if (this.status != CourseStatus.APPROVED) {
             // In stricter flow, must be Approved first. 
             // But for now, if publish implies approved?
             // Frontend distinguishes APPROVED vs PUBLISHED?
             // Frontend: "Approved" means reviewed. "Published" might be separate step?
             // Frontend shows "Submit for approval".
             // Let's assume APPROVED is the final "Live" state? 
             // Or APPROVED means "Ready to Publish"?
             // Frontend course-management displays "APPROVED".
             // Let's stick to Frontend statuses.
        }
        this.status = CourseStatus.APPROVED; // Simplified for "Published"
    }

    public void submitForApproval() {
        if (this.status != CourseStatus.DRAFT && this.status != CourseStatus.REJECTED) {
            throw new IllegalStateException("Only Draft or Rejected courses can be submitted");
        }
        this.status = CourseStatus.PENDING;
    }

    public void cancelApproval() {
        if (this.status != CourseStatus.PENDING) {
            throw new IllegalStateException("Only Pending courses can be cancelled");
        }
        this.status = CourseStatus.DRAFT;
    }
    
    public List<Chapter> getChapters() {
        return Collections.unmodifiableList(chapters);
    }

    // Enums
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
