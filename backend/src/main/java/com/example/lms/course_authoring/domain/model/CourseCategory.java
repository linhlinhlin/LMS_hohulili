package com.example.lms.course_authoring.domain.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class CourseCategory {

    private UUID id;
    private UUID parentId;
    private String code;
    private String name;
    private String slug;
    private String prefix;       // nullable — root categories only
    private String description;
    private String icon;
    private int sortOrder;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;

    // Transient: populated for tree responses
    private List<CourseCategory> children = new ArrayList<>();

    // --- Factory methods ---

    public static CourseCategory createRoot(String code, String name, String slug, String prefix, String description, String icon) {
        var cat = new CourseCategory();
        cat.code = code;
        cat.name = name;
        cat.slug = slug;
        cat.prefix = prefix;
        cat.description = description;
        cat.icon = icon;
        cat.sortOrder = 0;
        cat.active = true;
        return cat;
    }

    public static CourseCategory createSub(UUID parentId, String code, String name, String slug, String description) {
        if (parentId == null) throw new IllegalArgumentException("Subcategory must have a parent");
        var cat = new CourseCategory();
        cat.parentId = parentId;
        cat.code = code;
        cat.name = name;
        cat.slug = slug;
        cat.prefix = null; // subcategories don't have prefix
        cat.description = description;
        cat.sortOrder = 0;
        cat.active = true;
        return cat;
    }

    // --- Reconstitution (from persistence) ---

    public static CourseCategory reconstitute(UUID id, UUID parentId, String code, String name, String slug,
                                               String prefix, String description, String icon,
                                               int sortOrder, boolean active, Instant createdAt, Instant updatedAt) {
        var cat = new CourseCategory();
        cat.id = id;
        cat.parentId = parentId;
        cat.code = code;
        cat.name = name;
        cat.slug = slug;
        cat.prefix = prefix;
        cat.description = description;
        cat.icon = icon;
        cat.sortOrder = sortOrder;
        cat.active = active;
        cat.createdAt = createdAt;
        cat.updatedAt = updatedAt;
        return cat;
    }

    // --- Behavior ---

    public boolean isRoot() { return parentId == null; }
    public boolean isSubcategory() { return parentId != null; }

    public void activate() { this.active = true; }
    public void deactivate() { this.active = false; }

    public void update(String name, String slug, String description, String icon) {
        this.name = name;
        this.slug = slug;
        this.description = description;
        this.icon = icon;
    }

    public void updatePrefix(String prefix) {
        if (!isRoot()) throw new IllegalStateException("Only root categories can have a prefix");
        this.prefix = prefix;
    }

    public void reorder(int sortOrder) { this.sortOrder = sortOrder; }

    public void addChild(CourseCategory child) { this.children.add(child); }

    // --- Getters ---
    public UUID getId() { return id; }
    public UUID getParentId() { return parentId; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getSlug() { return slug; }
    public String getPrefix() { return prefix; }
    public String getDescription() { return description; }
    public String getIcon() { return icon; }
    public int getSortOrder() { return sortOrder; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<CourseCategory> getChildren() { return children; }

    private CourseCategory() {} // prevent external construction
}
