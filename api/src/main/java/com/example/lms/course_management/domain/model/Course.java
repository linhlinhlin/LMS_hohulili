package com.example.lms.course_management.domain.model;

import com.example.lms.entity.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Entity(name = "CourseAuthoring")
@Table(name = "course_authoring")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User teacher;

    @Column(name = "category_id")
    private Integer categoryId;

    @Column(name = "price")
    private BigDecimal price; // Changed to BigDecimal for money

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
    @Builder.Default
    private CourseStatus status = CourseStatus.DRAFT;

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<Chapter> chapters = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

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
        this.status = CourseStatus.PUBLISHED;
    }
    
    public List<Chapter> getChapters() {
        return Collections.unmodifiableList(chapters);
    }

    // Enums

    public enum CourseStatus {
        DRAFT, PUBLISHED, ARCHIVED
    }

    public enum CoursePriceType {
        FREE, PAID
    }

    public enum CourseUnlockMode {
        OPEN_ALL, SEQUENTIAL
    }
}
