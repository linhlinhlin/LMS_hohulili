package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "sections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Section {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    @JsonIgnore
    private Lesson lesson;
    
    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SectionType type; // VIDEO, TEXT, QUIZ, FILE, ASSIGNMENT
    
    @Column(columnDefinition = "TEXT")
    private String content;
    
    @Column(name = "video_url", length = 500)
    private String videoUrl;

    // Cloudflare R2 integration fields
    // videoType: YOUTUBE | CLOUDFLARE (optional for backward compatibility)
    @Column(name = "video_type", length = 20)
    private String videoType;

    // Object key in R2 bucket, e.g., lessons/{lessonId}/{uuid}.mp4
    @Column(name = "cf_object_key", length = 512)
    private String cfObjectKey;

    @Column(name = "file_url", length = 500)
    private String fileUrl;
    
    @Column(name = "is_required", nullable = false)
    @Builder.Default
    private Boolean isRequired = false;
    
    @Column(name = "duration")
    @Builder.Default
    private Integer duration = 0;
    
    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnore
    private List<Quiz> quizzes = new ArrayList<>();

    public enum SectionType {
        VIDEO, TEXT, QUIZ, FILE, ASSIGNMENT
    }
}
