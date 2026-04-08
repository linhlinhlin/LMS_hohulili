package com.example.lms.communication.application.usecase;

import com.example.lms.communication.application.service.WebSocketMessageService;
import com.example.lms.communication.domain.model.Announcement;
import com.example.lms.communication.domain.repository.AnnouncementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CreateAnnouncementUseCase {

    private final AnnouncementRepository announcementRepository;
    private final WebSocketMessageService webSocketMessageService;

    public record CreateAnnouncementCommand(
            UUID courseId,
            UUID authorId,
            String authorName,
            String title,
            String content,
            String priority,
            String targetType
    ) {}

    @Transactional
    public Announcement execute(CreateAnnouncementCommand cmd) {
        log.info("Creating announcement for course {} by {}", cmd.courseId(), cmd.authorId());

        Announcement.Priority priority = Announcement.Priority.NORMAL;
        if ("IMPORTANT".equalsIgnoreCase(cmd.priority())) {
            priority = Announcement.Priority.IMPORTANT;
        }

        Announcement.TargetType targetType = Announcement.TargetType.COURSE;
        if (cmd.targetType() != null) {
            try { targetType = Announcement.TargetType.valueOf(cmd.targetType().toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }

        Announcement announcement = Announcement.create(
                cmd.courseId(), cmd.authorId(), cmd.title(), cmd.content(), priority, targetType
        );

        Announcement saved = announcementRepository.save(announcement);

        // Broadcast via WebSocket
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("type", "NEW_ANNOUNCEMENT");
            payload.put("id", saved.getId());
            payload.put("courseId", saved.getCourseId());
            payload.put("authorId", saved.getAuthorId());
            payload.put("authorName", cmd.authorName());
            payload.put("title", saved.getTitle());
            payload.put("content", saved.getContent());
            payload.put("priority", saved.getPriority().name());
            payload.put("publishedAt", saved.getPublishedAt());
            webSocketMessageService.broadcastAnnouncement(saved.getCourseId(), payload);
        } catch (Exception e) {
            log.warn("WebSocket broadcast for announcement failed: {}", e.getMessage());
        }

        log.info("Announcement created: {}", saved.getId());
        return saved;
    }
}
