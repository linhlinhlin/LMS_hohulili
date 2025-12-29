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
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
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
}
