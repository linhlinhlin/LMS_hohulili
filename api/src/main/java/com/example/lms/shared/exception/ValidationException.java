package com.example.lms.shared.exception;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Exception thrown when validation fails.
 * Can contain multiple field-level validation errors.
 */
public class ValidationException extends DomainException {

    private final Map<String, String> fieldErrors;

    public ValidationException(String message) {
        super("VALIDATION_ERROR", message);
        this.fieldErrors = Collections.emptyMap();
    }

    public ValidationException(String field, String message) {
        super("VALIDATION_ERROR", message);
        this.fieldErrors = Map.of(field, message);
    }

    public ValidationException(Map<String, String> fieldErrors) {
        super("VALIDATION_ERROR", "Dữ liệu không hợp lệ");
        this.fieldErrors = fieldErrors != null ? new HashMap<>(fieldErrors) : Collections.emptyMap();
    }

    public Map<String, String> getFieldErrors() {
        return Collections.unmodifiableMap(fieldErrors);
    }

    public boolean hasFieldErrors() {
        return !fieldErrors.isEmpty();
    }

    /**
     * Builder for creating ValidationException with multiple field errors.
     */
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final Map<String, String> errors = new HashMap<>();

        public Builder addError(String field, String message) {
            errors.put(field, message);
            return this;
        }

        public Builder addErrorIf(boolean condition, String field, String message) {
            if (condition) {
                errors.put(field, message);
            }
            return this;
        }

        public boolean hasErrors() {
            return !errors.isEmpty();
        }

        public ValidationException build() {
            return new ValidationException(errors);
        }

        public void throwIfHasErrors() {
            if (hasErrors()) {
                throw build();
            }
        }
    }
}
