package com.example.lms.shared.domain.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

/**
 * Immutable revenue split record — one per completed PaymentTransaction.
 * <p>
 * teacher_amount = gross - platform_amount - org_amount
 * This residual calculation avoids cumulative rounding errors in VND (integer currency).
 */
public class RevenueSplit {

    private final UUID       id;
    private final UUID       paymentId;
    private final UUID       courseId;
    private final UUID       teacherId;
    private final UUID       orgId;           // null = individual / default org

    private final BigDecimal grossAmount;
    private final BigDecimal platformFeePct;
    private final BigDecimal teacherSharePct;
    private final BigDecimal orgSharePct;

    private final BigDecimal platformAmount;
    private final BigDecimal teacherAmount;
    private final BigDecimal orgAmount;

    private final Instant    createdAt;

    private RevenueSplit(UUID id, UUID paymentId, UUID courseId, UUID teacherId, UUID orgId,
                          BigDecimal grossAmount,
                          BigDecimal platformFeePct, BigDecimal teacherSharePct, BigDecimal orgSharePct,
                          BigDecimal platformAmount, BigDecimal teacherAmount, BigDecimal orgAmount,
                          Instant createdAt) {
        this.id             = id;
        this.paymentId      = paymentId;
        this.courseId       = courseId;
        this.teacherId      = teacherId;
        this.orgId          = orgId;
        this.grossAmount    = grossAmount;
        this.platformFeePct = platformFeePct;
        this.teacherSharePct= teacherSharePct;
        this.orgSharePct    = orgSharePct;
        this.platformAmount = platformAmount;
        this.teacherAmount  = teacherAmount;
        this.orgAmount      = orgAmount;
        this.createdAt      = createdAt;
    }

    /**
     * Create a new revenue split from a completed payment.
     * Amounts are rounded to whole VND (HALF_UP).
     */
    public static RevenueSplit create(UUID paymentId, UUID courseId, UUID teacherId,
                                       UUID orgId, BigDecimal gross,
                                       OrgPaymentConfig config) {
        BigDecimal hundred = BigDecimal.valueOf(100);

        BigDecimal platformAmt = gross.multiply(config.getPlatformFeePct())
                .divide(hundred, 0, RoundingMode.HALF_UP);
        BigDecimal orgAmt = gross.multiply(config.getOrgSharePct())
                .divide(hundred, 0, RoundingMode.HALF_UP);
        // Residual: avoids rounding drift
        BigDecimal teacherAmt = gross.subtract(platformAmt).subtract(orgAmt);

        return new RevenueSplit(null, paymentId, courseId, teacherId, orgId,
                gross,
                config.getPlatformFeePct(), config.getTeacherSharePct(), config.getOrgSharePct(),
                platformAmt, teacherAmt, orgAmt,
                Instant.now());
    }

    /** Reconstitute from persistence. */
    public static RevenueSplit reconstitute(UUID id, UUID paymentId, UUID courseId,
                                             UUID teacherId, UUID orgId,
                                             BigDecimal grossAmount,
                                             BigDecimal platformFeePct, BigDecimal teacherSharePct,
                                             BigDecimal orgSharePct,
                                             BigDecimal platformAmount, BigDecimal teacherAmount,
                                             BigDecimal orgAmount, Instant createdAt) {
        return new RevenueSplit(id, paymentId, courseId, teacherId, orgId,
                grossAmount, platformFeePct, teacherSharePct, orgSharePct,
                platformAmount, teacherAmount, orgAmount, createdAt);
    }

    public UUID       getId()             { return id; }
    public UUID       getPaymentId()      { return paymentId; }
    public UUID       getCourseId()       { return courseId; }
    public UUID       getTeacherId()      { return teacherId; }
    public UUID       getOrgId()          { return orgId; }
    public BigDecimal getGrossAmount()    { return grossAmount; }
    public BigDecimal getPlatformFeePct() { return platformFeePct; }
    public BigDecimal getTeacherSharePct(){ return teacherSharePct; }
    public BigDecimal getOrgSharePct()    { return orgSharePct; }
    public BigDecimal getPlatformAmount() { return platformAmount; }
    public BigDecimal getTeacherAmount()  { return teacherAmount; }
    public BigDecimal getOrgAmount()      { return orgAmount; }
    public Instant    getCreatedAt()      { return createdAt; }
}
