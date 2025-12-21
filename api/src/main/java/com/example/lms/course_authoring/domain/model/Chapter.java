package com.example.lms.course_authoring.domain.model;

import com.example.lms.shared.domain.model.BaseEntity;
import jakarta.persistence.*;
import java.util.*;

/**
 * Chapter entity representing a section/module within a course.
 * Chapters contain lessons and are ordered within a course.
 */
@Entity
@Table(name = "chapters")
public class Chapter extends BaseEntity {

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @OneToMany(mappedBy = "chapter", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private Set<Lesson> lessons = new LinkedHashSet<>();

    // JPA requires default constructor
    protected Chapter() {}

    // ==================== Factory Methods ====================

    /**
     * Create a new chapter within a course.
     */
    static Chapter create(Course course, String title, String description, int orderIndex) {
        validateTitle(title);
        Objects.requireNonNull(course, "Course không được để trống");

        Chapter chapter = new Chapter();
        chapter.course = course;
        chapter.title = title.trim();
        chapter.description = description;
        chapter.orderIndex = orderIndex;
        return chapter;
    }

    // ==================== Domain Behavior ====================

    /**
     * Update chapter information.
     */
    public void updateInfo(String title, String description) {
        if (title != null && !title.isBlank()) {
            validateTitle(title);
            this.title = title.trim();
        }
        this.description = description;
    }

    /**
     * Add a new lesson to this chapter.
     */
    public Lesson addLesson(String title, String description, Lesson.LessonType lessonType) {
        int orderIndex = lessons.size();
        Lesson lesson = Lesson.create(this, title, description, lessonType, orderIndex);
        lessons.add(lesson);
        return lesson;
    }

    /**
     * Remove a lesson from this chapter.
     */
    public void removeLesson(UUID lessonId) {
        lessons.removeIf(l -> l.getId().equals(lessonId));
        reorderLessons();
    }

    /**
     * Reorder lessons within this chapter.
     */
    public void reorderLessons(List<UUID> lessonIds) {
        if (lessonIds.size() != lessons.size()) {
            throw new IllegalArgumentException("Số lượng lesson không khớp");
        }

        Map<UUID, Lesson> lessonMap = new HashMap<>();
        for (Lesson lesson : lessons) {
            lessonMap.put(lesson.getId(), lesson);
        }

        List<Lesson> reordered = new ArrayList<>();
        for (int i = 0; i < lessonIds.size(); i++) {
            Lesson lesson = lessonMap.get(lessonIds.get(i));
            if (lesson == null) {
                throw new IllegalArgumentException("Lesson không tồn tại: " + lessonIds.get(i));
            }
            lesson.setOrderIndex(i);
            reordered.add(lesson);
        }

        lessons.clear();
        lessons.addAll(reordered);
    }

    // ==================== Helper Methods ====================

    void setOrderIndex(int orderIndex) {
        this.orderIndex = orderIndex;
    }

    private void reorderLessons() {
        List<Lesson> lessonList = new ArrayList<>(lessons);
        for (int i = 0; i < lessonList.size(); i++) {
            lessonList.get(i).setOrderIndex(i);
        }
    }

    private static void validateTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Tên chương không được để trống");
        }
        if (title.length() > 255) {
            throw new IllegalArgumentException("Tên chương không được vượt quá 255 ký tự");
        }
    }

    // ==================== Query Methods ====================

    public int getLessonCount() {
        return lessons.size();
    }

    public Optional<Lesson> findLesson(UUID lessonId) {
        return lessons.stream()
                .filter(l -> l.getId().equals(lessonId))
                .findFirst();
    }

    // ==================== Getters ====================

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public Integer getOrderIndex() { return orderIndex; }
    public Course getCourse() { return course; }
    public Set<Lesson> getLessons() { return Collections.unmodifiableSet(lessons); }

    // Package-private setter for Course to manage bidirectional relationship
    void setCourse(Course course) {
        this.course = course;
    }
}
