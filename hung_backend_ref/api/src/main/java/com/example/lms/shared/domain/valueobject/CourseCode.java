package com.example.lms.shared.domain.valueobject;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Value object representing a course code.
 * Course codes are unique identifiers for courses, typically alphanumeric.
 * Example: "CS101", "MATH200", "ENG001"
 */
@Embeddable
public class CourseCode {

    // Allow alphanumeric, hyphens, and underscores, 3-64 characters
    private static final Pattern CODE_PATTERN = 
        Pattern.compile("^[A-Za-z0-9_-]{3,64}$");

    @Column(name = "code")
    private String value;

    // JPA requires default constructor
    protected CourseCode() {}

    private CourseCode(String value) {
        this.value = value;
    }

    /**
     * Factory method to create a validated CourseCode.
     * 
     * @param value the course code string
     * @return CourseCode value object
     * @throws IllegalArgumentException if code is invalid
     */
    public static CourseCode of(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Mã khóa học không được để trống");
        }
        
        String normalized = value.trim().toUpperCase();
        
        if (!CODE_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException(
                "Mã khóa học phải từ 3-64 ký tự, chỉ chứa chữ cái, số, gạch ngang và gạch dưới: " + value);
        }
        
        return new CourseCode(normalized);
    }

    /**
     * Create CourseCode without validation (for reading from database).
     */
    public static CourseCode fromDatabase(String value) {
        if (value == null) return null;
        CourseCode code = new CourseCode();
        code.value = value;
        return code;
    }

    public String getValue() {
        return value;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CourseCode that = (CourseCode) o;
        return Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
