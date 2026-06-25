package com.example.lms.shared.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Org Payment Config Domain Tests")
class OrgPaymentConfigTest {

    @Test
    @DisplayName("Should derive organization share from platform and teacher percentages")
    void shouldDeriveOrgShare() {
        var config = OrgPaymentConfig.create(
                UUID.randomUUID(),
                BigDecimal.valueOf(10),
                BigDecimal.valueOf(75),
                BigDecimal.valueOf(100000));

        assertThat(config.getOrgSharePct()).isEqualByComparingTo(BigDecimal.valueOf(15));
    }

    @Test
    @DisplayName("Should reject negative financial values")
    void shouldRejectNegativeFinancialValues() {
        assertThatThrownBy(() -> OrgPaymentConfig.create(
                UUID.randomUUID(),
                BigDecimal.valueOf(-1),
                BigDecimal.valueOf(80),
                BigDecimal.valueOf(100000)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("platformFeePct");

        assertThatThrownBy(() -> OrgPaymentConfig.create(
                UUID.randomUUID(),
                BigDecimal.valueOf(10),
                BigDecimal.valueOf(-1),
                BigDecimal.valueOf(100000)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("teacherSharePct");

        assertThatThrownBy(() -> OrgPaymentConfig.create(
                UUID.randomUUID(),
                BigDecimal.valueOf(10),
                BigDecimal.valueOf(80),
                BigDecimal.valueOf(-1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("minPayoutAmount");
    }

    @Test
    @DisplayName("Should reject percentage sum above 100")
    void shouldRejectPercentageSumAbove100() {
        assertThatThrownBy(() -> OrgPaymentConfig.create(
                UUID.randomUUID(),
                BigDecimal.valueOf(50),
                BigDecimal.valueOf(51),
                BigDecimal.valueOf(100000)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must not exceed 100");
    }
}
