package com.example.lms.course_authoring.domain.model;

import java.time.Instant;
import java.util.UUID;

public class CourseTag {

    private UUID id;
    private String name;
    private String slug;
    private Instant createdAt;

    public static CourseTag create(String name, String slug) {
        var tag = new CourseTag();
        tag.name = name;
        tag.slug = slug;
        return tag;
    }

    public static CourseTag reconstitute(UUID id, String name, String slug, Instant createdAt) {
        var tag = new CourseTag();
        tag.id = id;
        tag.name = name;
        tag.slug = slug;
        tag.createdAt = createdAt;
        return tag;
    }

    public void rename(String name, String slug) {
        this.name = name;
        this.slug = slug;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getSlug() { return slug; }
    public Instant getCreatedAt() { return createdAt; }

    private CourseTag() {}
}
