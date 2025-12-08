package com.example.lms.course_management.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "chapters") // Renamed from 'sections' per plan
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Chapter {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(nullable = false)
    private String title;

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "is_published")
    @Builder.Default
    private boolean isPublished = false; // Granular control if needed

    @OneToMany(mappedBy = "chapter", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<Lesson> lessons = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    // Domain Behavior
    
    public void addLesson(Lesson lesson) {
        lesson.setChapter(this);
        this.lessons.add(lesson);
    }
    
    public void removeLesson(Lesson lesson) {
        this.lessons.remove(lesson);
        lesson.setChapter(null);
    }
    
    public List<Lesson> getLessons() {
        return Collections.unmodifiableList(lessons);
    }
}
