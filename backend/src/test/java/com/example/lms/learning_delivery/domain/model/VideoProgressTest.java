package com.example.lms.learning_delivery.domain.model;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.BitSet;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class VideoProgressTest {

    @Test
    @DisplayName("create() initializes with zero progress")
    void createInitializesEmpty() {
        VideoProgress vp = VideoProgress.create(UUID.randomUUID(), UUID.randomUUID(), "section-1", 100);

        assertThat(vp.getWatchedSeconds()).isZero();
        assertThat(vp.getProgressPercent()).isZero();
        assertThat(vp.isCompleted()).isFalse();
        assertThat(vp.getLastPosition()).isZero();
        assertThat(vp.getDurationSeconds()).isEqualTo(100);
    }

    @Test
    @DisplayName("markWatched() sets correct bits and recalculates")
    void markWatchedSetsCorrectBits() {
        VideoProgress vp = VideoProgress.create(UUID.randomUUID(), UUID.randomUUID(), "s1", 100);

        vp.markWatched(0, 30);

        assertThat(vp.getWatchedSeconds()).isEqualTo(30);
        assertThat(vp.getProgressPercent()).isEqualTo(30.0);
        assertThat(vp.isCompleted()).isFalse();
    }

    @Test
    @DisplayName("markWatched() accumulates non-overlapping ranges")
    void markWatchedAccumulatesRanges() {
        VideoProgress vp = VideoProgress.create(UUID.randomUUID(), UUID.randomUUID(), "s1", 100);

        vp.markWatched(0, 20);
        vp.markWatched(50, 70);

        assertThat(vp.getWatchedSeconds()).isEqualTo(40);
        assertThat(vp.getProgressPercent()).isEqualTo(40.0);
    }

    @Test
    @DisplayName("markWatched() handles overlapping ranges correctly (no double count)")
    void markWatchedOverlappingRanges() {
        VideoProgress vp = VideoProgress.create(UUID.randomUUID(), UUID.randomUUID(), "s1", 100);

        vp.markWatched(0, 30);
        vp.markWatched(20, 50); // overlaps 20-30

        assertThat(vp.getWatchedSeconds()).isEqualTo(50); // 0-50, not 60
        assertThat(vp.getProgressPercent()).isEqualTo(50.0);
    }

    @Test
    @DisplayName("90% threshold triggers completion")
    void completionAt90Percent() {
        VideoProgress vp = VideoProgress.create(UUID.randomUUID(), UUID.randomUUID(), "s1", 100);

        vp.markWatched(0, 89);
        assertThat(vp.isCompleted()).isFalse();

        vp.markWatched(89, 90);
        assertThat(vp.getWatchedSeconds()).isEqualTo(90);
        assertThat(vp.getProgressPercent()).isEqualTo(90.0);
        assertThat(vp.isCompleted()).isTrue();
    }

    @Test
    @DisplayName("100% watched yields 100% progress")
    void fullWatchYields100Percent() {
        VideoProgress vp = VideoProgress.create(UUID.randomUUID(), UUID.randomUUID(), "s1", 100);

        vp.markWatched(0, 100);

        assertThat(vp.getWatchedSeconds()).isEqualTo(100);
        assertThat(vp.getProgressPercent()).isEqualTo(100.0);
        assertThat(vp.isCompleted()).isTrue();
    }

    @Test
    @DisplayName("markWatched() clamps to duration bounds")
    void markWatchedClampsToLimits() {
        VideoProgress vp = VideoProgress.create(UUID.randomUUID(), UUID.randomUUID(), "s1", 50);

        vp.markWatched(-10, 200); // exceeds both bounds

        assertThat(vp.getWatchedSeconds()).isEqualTo(50); // clamped to 0-50
        assertThat(vp.getProgressPercent()).isEqualTo(100.0);
    }

    @Test
    @DisplayName("markWatched() ignores invalid range (from >= to)")
    void markWatchedIgnoresInvalidRange() {
        VideoProgress vp = VideoProgress.create(UUID.randomUUID(), UUID.randomUUID(), "s1", 100);

        vp.markWatched(50, 30); // invalid
        vp.markWatched(30, 30); // zero-width

        assertThat(vp.getWatchedSeconds()).isZero();
    }

    @Test
    @DisplayName("updateLastPosition() updates last position")
    void updateLastPosition() {
        VideoProgress vp = VideoProgress.create(UUID.randomUUID(), UUID.randomUUID(), "s1", 100);

        vp.updateLastPosition(42.5);
        assertThat(vp.getLastPosition()).isEqualTo(42.5);

        vp.updateLastPosition(85.0);
        assertThat(vp.getLastPosition()).isEqualTo(85.0);
    }

    @Test
    @DisplayName("updateDuration() recalculates progress with new duration")
    void updateDurationRecalculates() {
        VideoProgress vp = VideoProgress.create(UUID.randomUUID(), UUID.randomUUID(), "s1", 100);
        vp.markWatched(0, 50);
        assertThat(vp.getProgressPercent()).isEqualTo(50.0);

        // Duration was wrong — actually 200 seconds
        vp.updateDuration(200);
        assertThat(vp.getProgressPercent()).isEqualTo(25.0); // 50/200
        assertThat(vp.isCompleted()).isFalse();
    }

    @Test
    @DisplayName("BitSet serialization roundtrip preserves data")
    void bitSetSerializationRoundtrip() {
        VideoProgress vp = VideoProgress.create(UUID.randomUUID(), UUID.randomUUID(), "s1", 100);
        vp.markWatched(10, 30);
        vp.markWatched(60, 80);

        byte[] binary = vp.getWatchedSegmentsBinary();
        BitSet reconstituted = VideoProgress.fromBinary(binary);

        assertThat(reconstituted.cardinality()).isEqualTo(40);
        assertThat(reconstituted.get(10)).isTrue();
        assertThat(reconstituted.get(29)).isTrue();
        assertThat(reconstituted.get(30)).isFalse();
        assertThat(reconstituted.get(60)).isTrue();
        assertThat(reconstituted.get(79)).isTrue();
        assertThat(reconstituted.get(80)).isFalse();
    }

    @Test
    @DisplayName("fromBinary() handles null and empty input")
    void fromBinaryHandlesNullAndEmpty() {
        BitSet fromNull = VideoProgress.fromBinary(null);
        assertThat(fromNull.cardinality()).isZero();

        BitSet fromEmpty = VideoProgress.fromBinary(new byte[0]);
        assertThat(fromEmpty.cardinality()).isZero();
    }

    @Test
    @DisplayName("Builder reconstitutes from persistence correctly")
    void builderReconstitutesFromPersistence() {
        UUID id = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        BitSet segments = new BitSet(100);
        segments.set(0, 45);

        VideoProgress vp = VideoProgress.builder()
                .id(id)
                .studentId(studentId)
                .lessonId(lessonId)
                .sectionId("section-x")
                .durationSeconds(100)
                .watchedSegments(segments)
                .watchedSeconds(45)
                .progressPercent(45.0)
                .completed(false)
                .lastPosition(44.5)
                .build();

        assertThat(vp.getId()).isEqualTo(id);
        assertThat(vp.getStudentId()).isEqualTo(studentId);
        assertThat(vp.getSectionId()).isEqualTo("section-x");
        assertThat(vp.getWatchedSeconds()).isEqualTo(45);
        assertThat(vp.getProgressPercent()).isEqualTo(45.0);
        assertThat(vp.getLastPosition()).isEqualTo(44.5);
    }

    @Test
    @DisplayName("Zero duration video has 0% progress")
    void zeroDurationVideoProgress() {
        VideoProgress vp = VideoProgress.create(UUID.randomUUID(), UUID.randomUUID(), "s1", 0);
        vp.markWatched(0, 10);

        // Duration is 0, so progressPercent should stay 0
        assertThat(vp.getProgressPercent()).isZero();
        assertThat(vp.isCompleted()).isFalse();
    }
}
