package com.example.lms.shared.exception;

/**
 * Exception thrown when a user is not authorized to perform an action.
 */
public class UnauthorizedException extends DomainException {

    public UnauthorizedException() {
        super("UNAUTHORIZED", "Bạn không có quyền thực hiện thao tác này");
    }

    public UnauthorizedException(String message) {
        super("UNAUTHORIZED", message);
    }

    public UnauthorizedException(String action, String resource) {
        super("UNAUTHORIZED", String.format("Bạn không có quyền %s %s", action, resource));
    }
}
