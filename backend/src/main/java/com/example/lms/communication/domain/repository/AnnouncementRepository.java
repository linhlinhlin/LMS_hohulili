package com.example.lms.communication.domain.repository;

import com.example.lms.communication.domain.model.Announcement;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AnnouncementRepository {
    Announcement save(Announcement announcement);
    Optional<Announcement> findById(UUID id);
    List<Announcement> findByCourseId(UUID courseId);
    List<Announcement> findByCourseIds(List<UUID> courseIds);
    void deleteById(UUID id);
}
