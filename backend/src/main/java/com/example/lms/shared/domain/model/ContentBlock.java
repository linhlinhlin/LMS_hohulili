package com.example.lms.shared.domain.model;

import java.io.Serializable;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Immutable Value Object representing a content block.
 * Content blocks are the building blocks of lessons (text, image, video, code, etc.)
 */
public final class ContentBlock implements Serializable {

    private static final long serialVersionUID = 1L;

    private final String id;
    private final String type;
    private final Map<String, Object> data;

    // Private constructor for Jackson deserialization
    private ContentBlock() {
        this.id = null;
        this.type = null;
        this.data = null;
    }

    private ContentBlock(String id, String type, Map<String, Object> data) {
        this.id = id;
        this.type = type;
        this.data = data == null ? Collections.emptyMap() : Collections.unmodifiableMap(new HashMap<>(data));
    }

    public static ContentBlock create(String type, Map<String, Object> data) {
        Objects.requireNonNull(type, "ContentBlock type cannot be null");
        return new ContentBlock(UUID.randomUUID().toString(), type, data);
    }

    public static ContentBlock of(String id, String type, Map<String, Object> data) {
        Objects.requireNonNull(id, "ContentBlock id cannot be null");
        Objects.requireNonNull(type, "ContentBlock type cannot be null");
        return new ContentBlock(id, type, data);
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getId() {
        return id;
    }

    public String getType() {
        return type;
    }

    public Map<String, Object> getData() {
        return data; // Already unmodifiable
    }

    public ContentBlock withType(String newType) {
        return new ContentBlock(this.id, newType, this.data);
    }

    public ContentBlock withData(Map<String, Object> newData) {
        return new ContentBlock(this.id, this.type, newData);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ContentBlock that = (ContentBlock) o;
        return Objects.equals(id, that.id) &&
               Objects.equals(type, that.type) &&
               Objects.equals(data, that.data);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, type, data);
    }

    @Override
    public String toString() {
        return "ContentBlock{id='" + id + "', type='" + type + "'}";
    }

    public static final class Builder {
        private String id;
        private String type;
        private Map<String, Object> data;

        private Builder() {}

        public Builder id(String id) {
            this.id = id;
            return this;
        }

        public Builder type(String type) {
            this.type = type;
            return this;
        }

        public Builder data(Map<String, Object> data) {
            this.data = data;
            return this;
        }

        public ContentBlock build() {
            if (id == null) {
                id = UUID.randomUUID().toString();
            }
            Objects.requireNonNull(type, "ContentBlock type cannot be null");
            return new ContentBlock(id, type, data);
        }
    }
}
