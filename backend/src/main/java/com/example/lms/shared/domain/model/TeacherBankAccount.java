package com.example.lms.shared.domain.model;

import java.time.Instant;
import java.util.UUID;

public class TeacherBankAccount {

    private final UUID   id;
    private final UUID   teacherId;
    private final String bankCode;
    private final String accountNumber;
    private final String accountName;
    private       boolean isDefault;
    private       boolean verified;
    private final Instant createdAt;

    private TeacherBankAccount(UUID id, UUID teacherId, String bankCode,
                                String accountNumber, String accountName,
                                boolean isDefault, boolean verified, Instant createdAt) {
        this.id            = id;
        this.teacherId     = teacherId;
        this.bankCode      = bankCode;
        this.accountNumber = accountNumber;
        this.accountName   = accountName;
        this.isDefault     = isDefault;
        this.verified      = verified;
        this.createdAt     = createdAt;
    }

    /** Factory: create new account (id assigned by DB). */
    public static TeacherBankAccount create(UUID teacherId, String bankCode,
                                             String accountNumber, String accountName,
                                             boolean isDefault) {
        return new TeacherBankAccount(null, teacherId, bankCode,
                accountNumber, accountName, isDefault, false, Instant.now());
    }

    /** Factory: reconstitute from persistence. */
    public static TeacherBankAccount reconstitute(UUID id, UUID teacherId, String bankCode,
                                                   String accountNumber, String accountName,
                                                   boolean isDefault, boolean verified,
                                                   Instant createdAt) {
        return new TeacherBankAccount(id, teacherId, bankCode,
                accountNumber, accountName, isDefault, verified, createdAt);
    }

    public void setAsDefault() { this.isDefault = true; }
    public void clearDefault()  { this.isDefault = false; }
    public void verify()        { this.verified = true; }

    public UUID    getId()            { return id; }
    public UUID    getTeacherId()     { return teacherId; }
    public String  getBankCode()      { return bankCode; }
    public String  getAccountNumber() { return accountNumber; }
    public String  getAccountName()   { return accountName; }
    public boolean isDefault()        { return isDefault; }
    public boolean isVerified()       { return verified; }
    public Instant getCreatedAt()     { return createdAt; }
}
