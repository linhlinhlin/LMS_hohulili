package com.example.lms.shared.domain.event;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Fired after a PaymentTransaction transitions to COMPLETED status.
 * Consumed by PaymentCompletedEventHandler to create the revenue split record.
 */
public class PaymentCompletedEvent extends AbstractDomainEvent {

    private final UUID       courseId;
    private final UUID       studentId;
    private final BigDecimal amount;

    public PaymentCompletedEvent(UUID paymentId, UUID courseId, UUID studentId, BigDecimal amount) {
        super(paymentId);   // aggregateId = paymentId
        this.courseId  = courseId;
        this.studentId = studentId;
        this.amount    = amount;
    }

    /** paymentId == aggregateId */
    public UUID       getPaymentId() { return getAggregateId(); }
    public UUID       getCourseId()  { return courseId; }
    public UUID       getStudentId() { return studentId; }
    public BigDecimal getAmount()    { return amount; }
}
