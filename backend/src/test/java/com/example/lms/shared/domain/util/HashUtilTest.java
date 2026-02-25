package com.example.lms.shared.domain.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HashUtilTest {

    @Test
    void shouldProduceConsistentHash() {
        String first = HashUtil.sha256("test");
        String second = HashUtil.sha256("test");

        assertThat(first).isEqualTo(second);
        assertThat(first).hasSize(64);
        assertThat(first).matches("^[0-9a-f]{64}$");
    }

    @Test
    void shouldProduceDifferentHashForDifferentInput() {
        String hashA = HashUtil.sha256("a");
        String hashB = HashUtil.sha256("b");

        assertThat(hashA).isNotEqualTo(hashB);
    }
}
