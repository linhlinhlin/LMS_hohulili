package com.example.lms.shared.domain.model;

import lombok.*;

import java.io.Serializable;
import java.util.Map;

public class ContentBlock implements Serializable {
    public ContentBlock() {}
    public ContentBlock(String type, Map<String, Object> data, String id) {
        this.type = type; this.data = data; this.id = id;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private String type; private Map<String, Object> data; private String id;
        public Builder type(String type) { this.type = type; return this; }
        public Builder data(Map<String, Object> data) { this.data = data; return this; }
        public Builder id(String id) { this.id = id; return this; }
        public ContentBlock build() { return new ContentBlock(type, data, id); }
    }
    
    private String type; // e.g., "text", "image", "code"
    private Map<String, Object> data; // e.g., {"html": "..."}
    private String id;
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Map<String, Object> getData() { return data; }
    public void setData(Map<String, Object> data) { this.data = data; }
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
}
