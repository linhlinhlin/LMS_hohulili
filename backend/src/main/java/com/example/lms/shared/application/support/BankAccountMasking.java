package com.example.lms.shared.application.support;

public final class BankAccountMasking {

    private BankAccountMasking() {
    }

    public static String mask(String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()) {
            return accountNumber;
        }
        if (accountNumber.length() <= 4) {
            return accountNumber;
        }
        return "****" + accountNumber.substring(accountNumber.length() - 4);
    }

    public static String viewerAware(String accountNumber, boolean showFull) {
        return showFull ? accountNumber : mask(accountNumber);
    }
}
