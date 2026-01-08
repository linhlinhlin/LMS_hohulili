package com.example.lms.shared.domain.valueobject;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Value object representing monetary amounts.
 * Handles currency and provides safe arithmetic operations.
 */
@Embeddable
public class Money {

    @Column(name = "amount", precision = 19, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "currency", length = 3)
    private Currency currency;

    // JPA requires default constructor
    protected Money() {}

    private Money(BigDecimal amount, Currency currency) {
        this.amount = amount.setScale(2, RoundingMode.HALF_UP);
        this.currency = currency;
    }

    /**
     * Create Money with specified amount and currency.
     */
    public static Money of(BigDecimal amount, Currency currency) {
        if (amount == null) {
            throw new IllegalArgumentException("Số tiền không được để trống");
        }
        if (currency == null) {
            throw new IllegalArgumentException("Loại tiền tệ không được để trống");
        }
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Số tiền không được âm");
        }
        return new Money(amount, currency);
    }

    /**
     * Create Money in VND (Vietnamese Dong).
     */
    public static Money vnd(BigDecimal amount) {
        return of(amount, Currency.VND);
    }

    /**
     * Create Money in VND from long value.
     */
    public static Money vnd(long amount) {
        return of(BigDecimal.valueOf(amount), Currency.VND);
    }

    /**
     * Create zero Money in specified currency.
     */
    public static Money zero(Currency currency) {
        return of(BigDecimal.ZERO, currency);
    }

    /**
     * Create free (zero VND) Money.
     */
    public static Money free() {
        return zero(Currency.VND);
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public Currency getCurrency() {
        return currency;
    }

    public boolean isFree() {
        return amount.compareTo(BigDecimal.ZERO) == 0;
    }

    public Money add(Money other) {
        validateSameCurrency(other);
        return new Money(this.amount.add(other.amount), this.currency);
    }

    public Money subtract(Money other) {
        validateSameCurrency(other);
        BigDecimal result = this.amount.subtract(other.amount);
        if (result.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Kết quả không được âm");
        }
        return new Money(result, this.currency);
    }

    public Money multiply(int multiplier) {
        return new Money(this.amount.multiply(BigDecimal.valueOf(multiplier)), this.currency);
    }

    public Money multiply(BigDecimal multiplier) {
        return new Money(this.amount.multiply(multiplier), this.currency);
    }

    public Money applyDiscount(BigDecimal discountPercent) {
        if (discountPercent.compareTo(BigDecimal.ZERO) < 0 || 
            discountPercent.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Phần trăm giảm giá phải từ 0-100");
        }
        BigDecimal discountFactor = BigDecimal.ONE.subtract(
            discountPercent.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
        return new Money(this.amount.multiply(discountFactor), this.currency);
    }

    private void validateSameCurrency(Money other) {
        if (other == null) {
            throw new IllegalArgumentException("Money không được null");
        }
        if (this.currency != other.currency) {
            throw new IllegalArgumentException(
                String.format("Không thể tính toán giữa %s và %s", this.currency, other.currency));
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Money money = (Money) o;
        return amount.compareTo(money.amount) == 0 && currency == money.currency;
    }

    @Override
    public int hashCode() {
        return Objects.hash(amount, currency);
    }

    @Override
    public String toString() {
        return String.format("%s %s", amount.toPlainString(), currency);
    }

    public String format() {
        return currency.format(amount);
    }

    public enum Currency {
        VND("₫", "Vietnamese Dong"),
        USD("$", "US Dollar");

        private final String symbol;
        private final String displayName;

        Currency(String symbol, String displayName) {
            this.symbol = symbol;
            this.displayName = displayName;
        }

        public String getSymbol() {
            return symbol;
        }

        public String getDisplayName() {
            return displayName;
        }

        public String format(BigDecimal amount) {
            if (this == VND) {
                return String.format("%,.0f%s", amount, symbol);
            }
            return String.format("%s%,.2f", symbol, amount);
        }
    }
}
