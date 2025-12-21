package com.example.lms.shared.domain.valueobject;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Value object representing an email address.
 * Ensures email format validation and normalization.
 */
@Embeddable
public class Email {

    private static final Pattern EMAIL_PATTERN = 
        Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    @Column(name = "email")
    private String value;

    // JPA requires default constructor
    protected Email() {}

    private Email(String value) {
        this.value = value;
    }

    /**
     * Factory method to create a validated Email.
     * 
     * @param value the email string
     * @return Email value object
     * @throws IllegalArgumentException if email is invalid
     */
    public static Email of(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Email không được để trống");
        }
        
        String normalized = value.toLowerCase().trim();
        
        if (!EMAIL_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("Email không đúng định dạng: " + value);
        }
        
        return new Email(normalized);
    }

    /**
     * Create Email without validation (for reading from database).
     * Use with caution - only for data that's already validated.
     */
    public static Email fromDatabase(String value) {
        if (value == null) return null;
        Email email = new Email();
        email.value = value;
        return email;
    }

    public String getValue() {
        return value;
    }

    public String getDomain() {
        if (value == null) return null;
        int atIndex = value.indexOf('@');
        return atIndex > 0 ? value.substring(atIndex + 1) : null;
    }

    public String getLocalPart() {
        if (value == null) return null;
        int atIndex = value.indexOf('@');
        return atIndex > 0 ? value.substring(0, atIndex) : value;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Email email = (Email) o;
        return Objects.equals(value, email.value);
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
