package com.example.lms.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "categories")
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    public Category() {}

    public Category(UUID id, String code, String name) {
        this.id = id;
        this.code = code;
        this.name = name;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    // Builder
    public static CategoryBuilder builder() { return new CategoryBuilder(); }
    public static class CategoryBuilder {
        private Category category = new Category();
        public CategoryBuilder id(UUID id) { category.setId(id); return this; }
        public CategoryBuilder code(String code) { category.setCode(code); return this; }
        public CategoryBuilder name(String name) { category.setName(name); return this; }
        public Category build() { return category; }
    }
}
