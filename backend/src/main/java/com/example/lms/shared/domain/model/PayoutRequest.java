package com.example.lms.shared.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class PayoutRequest {

    public enum Status { PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED }

    private final UUID       id;
    private final UUID       organizationId;
    private final UUID       teacherId;
    private final UUID       bankAccountId;
    private final BigDecimal amount;
    private       Status     status;
    private final String     teacherNote;
    private       String     adminNote;
    private       UUID       processedBy;
    private final Instant    requestedAt;
    private       Instant    processedAt;

    private PayoutRequest(UUID id, UUID organizationId, UUID teacherId, UUID bankAccountId, BigDecimal amount,
                           Status status, String teacherNote, String adminNote,
                           UUID processedBy, Instant requestedAt, Instant processedAt) {
        this.id            = id;
        this.organizationId = organizationId;
        this.teacherId     = teacherId;
        this.bankAccountId = bankAccountId;
        this.amount        = amount;
        this.status        = status;
        this.teacherNote   = teacherNote;
        this.adminNote     = adminNote;
        this.processedBy   = processedBy;
        this.requestedAt   = requestedAt;
        this.processedAt   = processedAt;
    }

    public static PayoutRequest create(UUID teacherId, UUID bankAccountId,
                                        BigDecimal amount, String teacherNote) {
        return create(teacherId, bankAccountId, amount, teacherNote, null);
    }

    public static PayoutRequest create(UUID teacherId, UUID bankAccountId,
                                        BigDecimal amount, String teacherNote,
                                        UUID organizationId) {
        return new PayoutRequest(null, organizationId, teacherId, bankAccountId, amount,
                Status.PENDING, teacherNote, null, null, Instant.now(), null);
    }

    public static PayoutRequest reconstitute(UUID id, UUID teacherId, UUID bankAccountId,
                                              BigDecimal amount, Status status,
                                              String teacherNote, String adminNote,
                                              UUID processedBy, Instant requestedAt,
                                              Instant processedAt) {
        return reconstitute(id, null, teacherId, bankAccountId, amount, status,
                teacherNote, adminNote, processedBy, requestedAt, processedAt);
    }

    public static PayoutRequest reconstitute(UUID id, UUID organizationId,
                                              UUID teacherId, UUID bankAccountId,
                                              BigDecimal amount, Status status,
                                              String teacherNote, String adminNote,
                                              UUID processedBy, Instant requestedAt,
                                              Instant processedAt) {
        return new PayoutRequest(id, organizationId, teacherId, bankAccountId, amount, status,
                teacherNote, adminNote, processedBy, requestedAt, processedAt);
    }

    public void approve(UUID adminId, String note) {
        if (status != Status.PENDING) throw new IllegalStateException("Only PENDING requests can be approved");
        this.status      = Status.APPROVED;
        this.adminNote   = note;
        this.processedBy = adminId;
        this.processedAt = Instant.now();
    }

    public void reject(UUID adminId, String note) {
        if (status != Status.PENDING) throw new IllegalStateException("Only PENDING requests can be rejected");
        this.status      = Status.REJECTED;
        this.adminNote   = note;
        this.processedBy = adminId;
        this.processedAt = Instant.now();
    }

    public void markCompleted(UUID adminId) {
        if (status != Status.APPROVED) throw new IllegalStateException("Only APPROVED requests can be completed");
        this.status      = Status.COMPLETED;
        this.processedBy = adminId;
        this.processedAt = Instant.now();
    }

    public void cancelByTeacher(String note) {
        if (status != Status.PENDING) throw new IllegalStateException("Only PENDING requests can be cancelled");
        this.status = Status.CANCELLED;
        this.adminNote = note;
        this.processedAt = Instant.now();
        this.processedBy = null;
    }

    public UUID       getId()            { return id; }
    public UUID       getOrganizationId(){ return organizationId; }
    public UUID       getTeacherId()     { return teacherId; }
    public UUID       getBankAccountId() { return bankAccountId; }
    public BigDecimal getAmount()        { return amount; }
    public Status     getStatus()        { return status; }
    public String     getTeacherNote()   { return teacherNote; }
    public String     getAdminNote()     { return adminNote; }
    public UUID       getProcessedBy()   { return processedBy; }
    public Instant    getRequestedAt()   { return requestedAt; }
    public Instant    getProcessedAt()   { return processedAt; }
}
