package com.example.lms.communication.infrastructure.web;

import com.example.lms.communication.application.usecase.CreateAnnouncementUseCase;
import com.example.lms.communication.application.usecase.GetAnnouncementsUseCase;
import com.example.lms.communication.domain.model.Announcement;
import com.example.lms.communication.domain.repository.AnnouncementRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@Tag(name = "Announcements", description = "Thông báo khóa học")
@RestController
@RequestMapping("/api/v3/announcements")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class AnnouncementController {

    private final CreateAnnouncementUseCase createAnnouncementUseCase;
    private final GetAnnouncementsUseCase getAnnouncementsUseCase;
    private final AnnouncementRepository announcementRepository;
    private final UserJpaRepository userJpaRepository;
    private final com.example.lms.communication.infrastructure.persistence.repository.AnnouncementReadJpaRepository announcementReadRepo;

    @Operation(summary = "Tạo thông báo mới (teacher/admin)")
    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createAnnouncement(
            @AuthenticationPrincipal UserJpaEntity user,
            @Valid @RequestBody CreateAnnouncementRequest request
    ) {
        Announcement announcement = createAnnouncementUseCase.execute(
                new CreateAnnouncementUseCase.CreateAnnouncementCommand(
                        request.courseId(), user.getId(), user.getFullName(),
                        request.title(), request.content(),
                        request.priority(), request.targetType()
                )
        );

        return ResponseEntity.ok(ApiResponse.success(
                mapAnnouncement(announcement, user.getFullName()),
                "Tạo thông báo thành công"
        ));
    }

    @Operation(summary = "Lấy danh sách thông báo theo khóa học")
    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAnnouncements(
            @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) List<UUID> courseIds
    ) {
        List<Announcement> announcements;
        if (courseId != null) {
            announcements = getAnnouncementsUseCase.byCourseId(courseId);
        } else if (courseIds != null && !courseIds.isEmpty()) {
            announcements = getAnnouncementsUseCase.byCourseIds(courseIds);
        } else {
            announcements = List.of();
        }

        // Batch fetch author names
        Set<UUID> authorIds = announcements.stream()
                .map(Announcement::getAuthorId)
                .collect(Collectors.toSet());
        Map<UUID, String> authorNames = batchFetchAuthorNames(authorIds);

        List<Map<String, Object>> result = announcements.stream()
                .map(a -> mapAnnouncement(a, authorNames.getOrDefault(a.getAuthorId(), "Unknown")))
                .toList();

        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách thông báo"));
    }

    @Operation(summary = "Lấy thông báo theo ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAnnouncement(
            @PathVariable UUID id
    ) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Thông báo", id));

        String authorName = batchFetchAuthorNames(Set.of(announcement.getAuthorId()))
                .getOrDefault(announcement.getAuthorId(), "Unknown");

        return ResponseEntity.ok(ApiResponse.success(
                mapAnnouncement(announcement, authorName),
                "Chi tiết thông báo"
        ));
    }

    @Operation(summary = "Xóa thông báo (author hoặc admin)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteAnnouncement(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID id
    ) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Thông báo", id));

        // Only author or admin can delete
        boolean isAdmin = user.getRole() == UserJpaEntity.UserRole.ADMIN ||
                           user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
        if (!announcement.getAuthorId().equals(user.getId()) && !isAdmin) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("FORBIDDEN", "Bạn không có quyền xóa thông báo này"));
        }

        announcementRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa thông báo thành công"));
    }

    @Operation(summary = "Đánh dấu thông báo đã đọc")
    @PostMapping("/mark-read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestBody Map<String, List<UUID>> request
    ) {
        List<UUID> announcementIds = request.getOrDefault("announcementIds", List.of());
        for (UUID announcementId : announcementIds) {
            var readId = new com.example.lms.communication.infrastructure.persistence.entity.AnnouncementReadJpaEntity
                    .AnnouncementReadId(announcementId, user.getId());
            if (!announcementReadRepo.existsById(readId)) {
                announcementReadRepo.save(
                        new com.example.lms.communication.infrastructure.persistence.entity.AnnouncementReadJpaEntity(
                                announcementId, user.getId()));
            }
        }
        return ResponseEntity.ok(ApiResponse.success(null, "Đã đánh dấu đọc"));
    }

    @Operation(summary = "Đếm thông báo chưa đọc")
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUnreadCount(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestParam List<UUID> courseIds
    ) {
        long count = announcementReadRepo.countUnreadByCourseIds(courseIds, user.getId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", count), "Số thông báo chưa đọc"));
    }

    @Operation(summary = "Lấy danh sách ID thông báo đã đọc")
    @GetMapping("/read-ids")
    public ResponseEntity<ApiResponse<Set<UUID>>> getReadIds(
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        Set<UUID> readIds = announcementReadRepo.findReadAnnouncementIdsByUserId(user.getId());
        return ResponseEntity.ok(ApiResponse.success(readIds, "Danh sách thông báo đã đọc"));
    }

    private Map<String, Object> mapAnnouncement(Announcement a, String authorName) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", a.getId());
        map.put("courseId", a.getCourseId());
        map.put("authorId", a.getAuthorId());
        map.put("authorName", authorName);
        map.put("title", a.getTitle());
        map.put("content", a.getContent());
        map.put("priority", a.getPriority().name());
        map.put("targetType", a.getTargetType().name());
        map.put("publishedAt", a.getPublishedAt());
        map.put("updatedAt", a.getUpdatedAt());
        return map;
    }

    private Map<UUID, String> batchFetchAuthorNames(Set<UUID> authorIds) {
        if (authorIds.isEmpty()) return Map.of();
        return userJpaRepository.findByIdIn(authorIds).stream()
                .collect(Collectors.toMap(UserJpaEntity::getId, UserJpaEntity::getFullName));
    }

    public record CreateAnnouncementRequest(
            @NotNull(message = "ID khóa học không được để trống") UUID courseId,
            @NotBlank(message = "Tiêu đề không được để trống") String title,
            @NotBlank(message = "Nội dung không được để trống") String content,
            String priority,
            String targetType
    ) {}
}
