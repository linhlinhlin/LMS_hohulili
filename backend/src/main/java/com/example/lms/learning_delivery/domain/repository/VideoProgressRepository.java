package com.example.lms.learning_delivery.domain.repository;

import com.example.lms.learning_delivery.domain.model.VideoProgress;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VideoProgressRepository {
    Optional<VideoProgress> findByStudentAndSection(UUID studentId, String sectionId);
    List<VideoProgress> findByStudentAndLesson(UUID studentId, UUID lessonId);
    List<VideoProgress> findByStudentIdAndUpdatedAtAfter(UUID studentId, Instant since);
    VideoProgress save(VideoProgress videoProgress);
}
