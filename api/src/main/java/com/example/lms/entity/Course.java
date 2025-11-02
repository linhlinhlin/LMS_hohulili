package com.example.lms.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "courses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false, onlyExplicitlyIncluded = true)
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
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CourseStatus status = CourseStatus.DRAFT;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;
    
    @ManyToMany(mappedBy = "enrolledCourses", fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private Set<User> enrolledStudents = new HashSet<>();
    
    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    @JsonIgnore
    private Set<Section> sections = new HashSet<>();
    
    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnore
    private Set<Assignment> assignments = new HashSet<>();

    @Column(nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
    
    @Column
    private Instant updatedAt;
    
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
}
