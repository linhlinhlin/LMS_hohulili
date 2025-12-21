package com.example.lms.shared.exception;

/**
 * Exception thrown when a business rule is violated.
 * Different from ValidationException in that it represents
 * domain-level business logic violations rather than input validation.
 */
public class BusinessRuleException extends DomainException {

    private final String ruleName;

    public BusinessRuleException(String message) {
        super("BUSINESS_RULE_VIOLATION", message);
        this.ruleName = null;
    }

    public BusinessRuleException(String ruleName, String message) {
        super("BUSINESS_RULE_VIOLATION", message);
        this.ruleName = ruleName;
    }

    public String getRuleName() {
        return ruleName;
    }

    // Common business rule violations
    public static BusinessRuleException courseNotEditable() {
        return new BusinessRuleException("COURSE_NOT_EDITABLE", 
            "Không thể chỉnh sửa khóa học ở trạng thái hiện tại");
    }

    public static BusinessRuleException courseNotPublishable() {
        return new BusinessRuleException("COURSE_NOT_PUBLISHABLE", 
            "Khóa học chưa đủ điều kiện để xuất bản");
    }

    public static BusinessRuleException alreadyEnrolled() {
        return new BusinessRuleException("ALREADY_ENROLLED", 
            "Học viên đã đăng ký khóa học này");
    }

    public static BusinessRuleException enrollmentClosed() {
        return new BusinessRuleException("ENROLLMENT_CLOSED", 
            "Lớp học đã đóng đăng ký");
    }

    public static BusinessRuleException classFull() {
        return new BusinessRuleException("CLASS_FULL", 
            "Lớp học đã đủ số lượng học viên");
    }

    public static BusinessRuleException courseNotApproved() {
        return new BusinessRuleException("COURSE_NOT_APPROVED", 
            "Chỉ có thể đăng ký vào khóa học đã được duyệt");
    }
}
