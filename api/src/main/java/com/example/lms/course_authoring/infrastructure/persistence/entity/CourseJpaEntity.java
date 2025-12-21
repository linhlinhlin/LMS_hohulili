package com.example.lms.course_authoring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

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
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CourseJpaEntity {

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
    @CollectionTable(name = "course_tags", joinColumns = @JoinColumn(name = "course_id"))
    @Column(name = "tag_name")
    private Set<String> tags = new HashSet<>();

    @Column(columnDefinition = "TEXT")
    private String welcomeMessage;

    @Column(name = "course_information", columnDefinition = "TEXT")
    private String courseInformation;

    @Column(columnDefinition = "TEXT")
    private String benefits;

    @Column(name = "intro_video_url")
    private String introVideoUrl;

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

    @Column(name = "review_comment", columnDefinition = "TEXT")
    private String reviewComment;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "reviewed_by_id")
    private UUID reviewedById;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

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
}
