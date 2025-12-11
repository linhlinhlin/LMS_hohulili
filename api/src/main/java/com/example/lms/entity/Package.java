package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "packages")
// Lombok annotations removed
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Package {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String subject; // Môn học (nullable)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @JsonIgnoreProperties({"password", "authorities", "accountNonExpired", "accountNonLocked", "credentialsNonExpired", "enrolledCourses"})
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Visibility visibility = Visibility.PRIVATE;

    @Column
    private Integer capacity; // Giới hạn số câu hỏi (nullable = unlimited)

    @OneToMany(mappedBy = "packageEntity", fetch = FetchType.LAZY)
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<Question> questions = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // Enums
    public enum Visibility {
        PUBLIC,  // Mọi người có thể xem
        PRIVATE  // Chỉ owner có thể xem
    }

    // Helper methods
    public int getQuestionCount() {
        return questions != null ? questions.size() : 0;
    }

    public boolean isFull() {
        return capacity != null && getQuestionCount() >= capacity;
    }

    public boolean canAddQuestions(int count) {
        if (capacity == null) return true; // Unlimited
        return getQuestionCount() + count <= capacity;
    }

    public boolean isOwnedBy(User user) {
        return owner != null && owner.getId().equals(user.getId());
    }

    public boolean isAccessibleBy(User user) {
        // Public packages are accessible by everyone
        if (visibility == Visibility.PUBLIC) return true;
        // Private packages only accessible by owner
        return isOwnedBy(user);
    }

    // Special constant for default package
    public static final UUID DEFAULT_PACKAGE_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    public boolean isDefaultPackage() {
        return DEFAULT_PACKAGE_ID.equals(this.id);
    }

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }
    public Visibility getVisibility() { return visibility; }
    public void setVisibility(Visibility visibility) { this.visibility = visibility; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public List<Question> getQuestions() { return questions; }
    public void setQuestions(List<Question> questions) { this.questions = questions; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public Package() {}

    public static PackageBuilder builder() { return new PackageBuilder(); }
    public static class PackageBuilder {
        private Package p = new Package();
        public PackageBuilder id(UUID id) { p.setId(id); return this; }
        public PackageBuilder name(String name) { p.setName(name); return this; }
        public PackageBuilder description(String description) { p.setDescription(description); return this; }
        public PackageBuilder subject(String subject) { p.setSubject(subject); return this; }
        public PackageBuilder owner(User owner) { p.setOwner(owner); return this; }
        public PackageBuilder visibility(Visibility visibility) { p.setVisibility(visibility); return this; }
        public PackageBuilder capacity(Integer capacity) { p.setCapacity(capacity); return this; }
        public PackageBuilder questions(List<Question> questions) { p.setQuestions(questions); return this; }
        public Package build() { return p; }
    }
}
