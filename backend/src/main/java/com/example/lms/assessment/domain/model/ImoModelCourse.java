package com.example.lms.assessment.domain.model;

public class ImoModelCourse {
    private final Integer id;
    private final String code;
    private final String title;
    private final String category;
    private final Integer displayOrder;
    private final boolean active;

    public ImoModelCourse(Integer id, String code, String title, String category, Integer displayOrder, boolean active) {
        this.id = id;
        this.code = code;
        this.title = title;
        this.category = category;
        this.displayOrder = displayOrder;
        this.active = active;
    }

    public Integer getId() { return id; }
    public String getCode() { return code; }
    public String getTitle() { return title; }
    public String getCategory() { return category; }
    public Integer getDisplayOrder() { return displayOrder; }
    public boolean isActive() { return active; }
}
