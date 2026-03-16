package com.example.lms.course_authoring.infrastructure.persistence.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(
        name = "course_publications",
        uniqueConstraints = @UniqueConstraint(columnNames = {"course_id", "publication_number"})
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoursePublicationJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "publication_number", nullable = false)
    private Integer publicationNumber;

    @Column(name = "content_version", nullable = false)
    private Integer contentVersion;

    @Type(JsonType.class)
    @Column(name = "snapshot", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> snapshot = new LinkedHashMap<>();

    @Column(name = "published_at", nullable = false)
    private Instant publishedAt;

    @Column(name = "published_by_id")
    private UUID publishedById;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
