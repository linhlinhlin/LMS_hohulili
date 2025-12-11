package com.example.lms.entity;

import jakarta.persistence.*;
import jakarta.persistence.Convert;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "courses")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Course {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    @NotBlank(message = "Mã khóa học không được để trống")
    @Size(max = 64, message = "Mã khóa học không được vượt quá 64 ký tự")
    private String code;

    @Column(nullable = false, length = 255)
    @NotBlank(message = "Tên khóa học không được để trống")
    @Size(max = 255, message = "Tên khóa học không được vượt quá 255 ký tự")
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false)
    @Convert(converter = com.example.lms.entity.converter.CourseStatusConverter.class)
    @Builder.Default
    private CourseStatus status = CourseStatus.DRAFT;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    @JsonIgnoreProperties({"password", "authorities", "accountNonExpired", "accountNonLocked", "credentialsNonExpired", "enrolledCourses"})
    private User teacher;
    
    @ManyToMany(mappedBy = "enrolledCourses", fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private Set<User> enrolledStudents = new HashSet<>();
    
    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    @JsonIgnore
    private Set<Chapter> chapters = new HashSet<>();
    
    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnore
    private Set<Assignment> assignments = new HashSet<>();

    @Column(nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
    
    @Column
    private Instant updatedAt;

    // --- New Fields for Course Information Expansion ---

    @Column(name = "instructor_id")
    private UUID instructorId;

    @ElementCollection
    @CollectionTable(name = "course_teaching_staff", joinColumns = @JoinColumn(name = "course_id"))
    @Column(name = "staff_id")
    @Builder.Default
    private Set<UUID> teachingStaffIds = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ElementCollection
    @CollectionTable(name = "course_tags", joinColumns = @JoinColumn(name = "course_id"))
    @Column(name = "tag_name")
    @Builder.Default
    private Set<String> tags = new HashSet<>();

    @Lob
    @Column(columnDefinition = "TEXT")
    private String welcomeMessage;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String courseInformation;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String benefits;

    private String introVideoUrl;
    private Integer credits;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Visibility visibility = Visibility.PUBLIC;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PriceType priceType = PriceType.FREE;

    @Column(precision = 19, scale = 2)
    private BigDecimal price;

    @Column(precision = 19, scale = 2)
    private BigDecimal salePrice;

    // ---------------------------------------------------
    
    // Review fields - Added for admin approval workflow
    @Column(columnDefinition = "TEXT")
    private String reviewComment;
    
    @Column
    private Instant reviewedAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    @JsonIgnoreProperties({"password", "authorities", "accountNonExpired", "accountNonLocked", "credentialsNonExpired", "enrolledCourses"})
    private User reviewedBy;
    
    // Constructor for creation
    public Course() {}
    
    public Course(String code, String title, String description, User teacher) {
        this.code = code;
        this.title = title;
        this.description = description;
        this.teacher = teacher;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
    
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
        PUBLIC, PRIVATE
    }

    public enum PriceType {
        FREE, PAID
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Course course = (Course) o;
        return java.util.Objects.equals(id, course.id);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(id);
    }

    // Manual Getters/Setters
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
    public User getTeacher() { return teacher; }
    public void setTeacher(User teacher) { this.teacher = teacher; }
    public Set<User> getEnrolledStudents() { return enrolledStudents; }
    public void setEnrolledStudents(Set<User> enrolledStudents) { this.enrolledStudents = enrolledStudents; }
    public Set<Chapter> getChapters() { return chapters; }
    public void setChapters(Set<Chapter> chapters) { this.chapters = chapters; }
    public Set<Assignment> getAssignments() { return assignments; }
    public void setAssignments(Set<Assignment> assignments) { this.assignments = assignments; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public UUID getInstructorId() { return instructorId; }
    public void setInstructorId(UUID instructorId) { this.instructorId = instructorId; }
    public Set<UUID> getTeachingStaffIds() { return teachingStaffIds; }
    public void setTeachingStaffIds(Set<UUID> teachingStaffIds) { this.teachingStaffIds = teachingStaffIds; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
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
    public String getReviewComment() { return reviewComment; }
    public void setReviewComment(String reviewComment) { this.reviewComment = reviewComment; }
    public Instant getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }
    public User getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(User reviewedBy) { this.reviewedBy = reviewedBy; }

    // Manual Builder
    public static CourseBuilder builder() { return new CourseBuilder(); }
    public static class CourseBuilder {
        private Course c = new Course();
        public CourseBuilder id(UUID id) { c.setId(id); return this; }
        public CourseBuilder code(String code) { c.setCode(code); return this; }
        public CourseBuilder title(String title) { c.setTitle(title); return this; }
        public CourseBuilder description(String description) { c.setDescription(description); return this; }
        public CourseBuilder status(CourseStatus status) { c.setStatus(status); return this; }
        public CourseBuilder teacher(User teacher) { c.setTeacher(teacher); return this; }
        public CourseBuilder enrolledStudents(Set<User> enrolledStudents) { c.setEnrolledStudents(enrolledStudents); return this; }
        public CourseBuilder chapters(Set<Chapter> chapters) { c.setChapters(chapters); return this; }
        public CourseBuilder assignments(Set<Assignment> assignments) { c.setAssignments(assignments); return this; }
        public CourseBuilder createdAt(Instant createdAt) { c.setCreatedAt(createdAt); return this; }
        public CourseBuilder updatedAt(Instant updatedAt) { c.setUpdatedAt(updatedAt); return this; }
        public CourseBuilder instructorId(UUID instructorId) { c.setInstructorId(instructorId); return this; }
        public CourseBuilder teachingStaffIds(Set<UUID> teachingStaffIds) { c.setTeachingStaffIds(teachingStaffIds); return this; }
        public CourseBuilder category(Category category) { c.setCategory(category); return this; }
        public CourseBuilder tags(Set<String> tags) { c.setTags(tags); return this; }
        public CourseBuilder welcomeMessage(String welcomeMessage) { c.setWelcomeMessage(welcomeMessage); return this; }
        public CourseBuilder courseInformation(String courseInformation) { c.setCourseInformation(courseInformation); return this; }
        public CourseBuilder benefits(String benefits) { c.setBenefits(benefits); return this; }
        public CourseBuilder introVideoUrl(String introVideoUrl) { c.setIntroVideoUrl(introVideoUrl); return this; }
        public CourseBuilder credits(Integer credits) { c.setCredits(credits); return this; }
        public CourseBuilder visibility(Visibility visibility) { c.setVisibility(visibility); return this; }
        public CourseBuilder priceType(PriceType priceType) { c.setPriceType(priceType); return this; }
        public CourseBuilder price(BigDecimal price) { c.setPrice(price); return this; }
        public CourseBuilder salePrice(BigDecimal salePrice) { c.setSalePrice(salePrice); return this; }
        public CourseBuilder reviewComment(String reviewComment) { c.setReviewComment(reviewComment); return this; }
        public CourseBuilder reviewedAt(Instant reviewedAt) { c.setReviewedAt(reviewedAt); return this; }
        public CourseBuilder reviewedBy(User reviewedBy) { c.setReviewedBy(reviewedBy); return this; }
        public Course build() { return c; }
    }
}
