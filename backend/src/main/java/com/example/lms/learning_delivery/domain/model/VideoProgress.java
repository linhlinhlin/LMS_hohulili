package com.example.lms.learning_delivery.domain.model;

import java.time.Instant;
import java.util.BitSet;
import java.util.UUID;

public class VideoProgress {

    private static final double DEFAULT_COMPLETION_THRESHOLD = 50.0;

    private UUID id;
    private UUID studentId;
    private UUID lessonId;
    private String sectionId;
    private int durationSeconds;
    private BitSet watchedSegments;
    private int watchedSeconds;
    private double progressPercent;
    private boolean completed;
    private double lastPosition;
    private Instant createdAt;
    private Instant updatedAt;

    /** Transient — teacher-configurable threshold (10–100%). Not persisted to DB. */
    private double completionThreshold = DEFAULT_COMPLETION_THRESHOLD;

    protected VideoProgress() {
        this.watchedSegments = new BitSet();
    }

    public static VideoProgress create(UUID studentId, UUID lessonId, String sectionId, int durationSeconds) {
        VideoProgress vp = new VideoProgress();
        vp.studentId = studentId;
        vp.lessonId = lessonId;
        vp.sectionId = sectionId;
        vp.durationSeconds = durationSeconds;
        vp.watchedSegments = new BitSet(durationSeconds);
        vp.createdAt = Instant.now();
        vp.updatedAt = Instant.now();
        return vp;
    }

    public void markWatched(int fromSecond, int toSecond) {
        if (fromSecond < 0) fromSecond = 0;
        if (durationSeconds > 0 && toSecond > durationSeconds) toSecond = durationSeconds;
        if (fromSecond >= toSecond) return;
        watchedSegments.set(fromSecond, toSecond);
        recalculate();
    }

    public void setCompletionThreshold(double threshold) {
        this.completionThreshold = Math.max(10.0, Math.min(100.0, threshold));
    }

    public double getCompletionThreshold() {
        return completionThreshold;
    }

    public void recalculate() {
        this.watchedSeconds = watchedSegments.cardinality();
        this.progressPercent = durationSeconds > 0
                ? Math.min(100.0, (double) watchedSeconds / durationSeconds * 100.0)
                : 0.0;
        this.completed = progressPercent >= completionThreshold;
        this.updatedAt = Instant.now();
    }

    public void updateLastPosition(double position) {
        this.lastPosition = position;
        this.updatedAt = Instant.now();
    }

    public void updateDuration(int durationSeconds) {
        if (durationSeconds > 0 && durationSeconds != this.durationSeconds) {
            this.durationSeconds = durationSeconds;
            recalculate();
        }
    }

    public byte[] getWatchedSegmentsBinary() {
        return watchedSegments.toByteArray();
    }

    public static BitSet fromBinary(byte[] data) {
        if (data == null || data.length == 0) return new BitSet();
        return BitSet.valueOf(data);
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getStudentId() { return studentId; }
    public UUID getLessonId() { return lessonId; }
    public String getSectionId() { return sectionId; }
    public int getDurationSeconds() { return durationSeconds; }
    public BitSet getWatchedSegments() { return watchedSegments; }
    public int getWatchedSeconds() { return watchedSeconds; }
    public double getProgressPercent() { return progressPercent; }
    public boolean isCompleted() { return completed; }
    public double getLastPosition() { return lastPosition; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    // Builder for reconstitution from persistence
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private UUID studentId;
        private UUID lessonId;
        private String sectionId;
        private int durationSeconds;
        private BitSet watchedSegments = new BitSet();
        private int watchedSeconds;
        private double progressPercent;
        private boolean completed;
        private double lastPosition;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(UUID v) { this.id = v; return this; }
        public Builder studentId(UUID v) { this.studentId = v; return this; }
        public Builder lessonId(UUID v) { this.lessonId = v; return this; }
        public Builder sectionId(String v) { this.sectionId = v; return this; }
        public Builder durationSeconds(int v) { this.durationSeconds = v; return this; }
        public Builder watchedSegments(BitSet v) { this.watchedSegments = v; return this; }
        public Builder watchedSeconds(int v) { this.watchedSeconds = v; return this; }
        public Builder progressPercent(double v) { this.progressPercent = v; return this; }
        public Builder completed(boolean v) { this.completed = v; return this; }
        public Builder lastPosition(double v) { this.lastPosition = v; return this; }
        public Builder createdAt(Instant v) { this.createdAt = v; return this; }
        public Builder updatedAt(Instant v) { this.updatedAt = v; return this; }

        public VideoProgress build() {
            VideoProgress vp = new VideoProgress();
            vp.id = id;
            vp.studentId = studentId;
            vp.lessonId = lessonId;
            vp.sectionId = sectionId;
            vp.durationSeconds = durationSeconds;
            vp.watchedSegments = watchedSegments != null ? watchedSegments : new BitSet();
            vp.watchedSeconds = watchedSeconds;
            vp.progressPercent = progressPercent;
            vp.completed = completed;
            vp.lastPosition = lastPosition;
            vp.createdAt = createdAt;
            vp.updatedAt = updatedAt;
            return vp;
        }
    }
}
