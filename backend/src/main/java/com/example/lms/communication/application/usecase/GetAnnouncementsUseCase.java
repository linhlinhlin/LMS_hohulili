package com.example.lms.communication.application.usecase;

import com.example.lms.communication.domain.model.Announcement;
import com.example.lms.communication.domain.repository.AnnouncementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GetAnnouncementsUseCase {

    private final AnnouncementRepository announcementRepository;

    public List<Announcement> byCourseId(UUID courseId) {
        return announcementRepository.findByCourseId(courseId);
    }

    public List<Announcement> byCourseIds(List<UUID> courseIds) {
        if (courseIds == null || courseIds.isEmpty()) return List.of();
        return announcementRepository.findByCourseIds(courseIds);
    }
}
