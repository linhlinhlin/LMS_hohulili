package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.domain.model.Bookmark;
import com.example.lms.shared.domain.repository.BookmarkRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

/**
 * Bookmark Controller V3 - Canvas-style bookmarks for courses and lessons.
 * Any authenticated user can create, list, update, and delete their own bookmarks.
 */
@Slf4j
@Tag(name = "Bookmarks V3", description = "API đánh dấu trang cho khóa học và bài học")
@RestController
@RequestMapping("/api/v3/bookmarks")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class BookmarkControllerV3 {

    private final BookmarkRepository bookmarkRepository;

    // ==================== List Bookmarks ====================

    @Operation(summary = "Lấy danh sách đánh dấu của người dùng")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listBookmarks(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @RequestParam(required = false) UUID courseId) {

        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Không được phép truy cập"));
        }

        List<Bookmark> bookmarks;
        if (courseId != null) {
            bookmarks = bookmarkRepository.findByUserIdAndCourseId(currentUser.getId(), courseId);
        } else {
            bookmarks = bookmarkRepository.findByUserId(currentUser.getId());
        }

        List<Map<String, Object>> result = bookmarks.stream()
                .map(this::toBookmarkMap)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách đánh dấu"));
    }

    // ==================== Create Bookmark ====================

    @Operation(summary = "Tạo đánh dấu mới")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> createBookmark(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody CreateBookmarkRequest request) {

        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Không được phép truy cập"));
        }

        // Check duplicate
        if (bookmarkRepository.existsByUserIdAndUrl(currentUser.getId(), request.url())) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Đánh dấu với URL này đã tồn tại"));
        }

        Bookmark bookmark = Bookmark.create(
                currentUser.getId(),
                request.courseId(),
                request.lessonId(),
                request.title(),
                request.url(),
                request.position() != null ? request.position() : 0,
                request.metadata()
        );

        Bookmark saved = bookmarkRepository.save(bookmark);
        log.info("[Bookmark] Tạo đánh dấu: user={}, course={}, url={}",
                currentUser.getId(), request.courseId(), request.url());

        return ResponseEntity.ok(ApiResponse.success(toBookmarkMap(saved), "Tạo đánh dấu thành công"));
    }

    // ==================== Update Bookmark ====================

    @Operation(summary = "Cập nhật đánh dấu")
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateBookmark(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateBookmarkRequest request) {

        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Không được phép truy cập"));
        }

        Optional<Bookmark> bookmarkOpt = bookmarkRepository.findById(id);
        if (bookmarkOpt.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.error("Không tìm thấy đánh dấu"));
        }

        Bookmark bookmark = bookmarkOpt.get();

        // Ownership check
        if (!bookmark.getUserId().equals(currentUser.getId())) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Không có quyền cập nhật đánh dấu này"));
        }

        bookmark.update(
                request.title(),
                request.position() != null ? request.position() : bookmark.getPosition()
        );

        Bookmark saved = bookmarkRepository.save(bookmark);
        return ResponseEntity.ok(ApiResponse.success(toBookmarkMap(saved), "Cập nhật đánh dấu thành công"));
    }

    // ==================== Delete Bookmark ====================

    @Operation(summary = "Xóa đánh dấu")
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteBookmark(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID id) {

        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Không được phép truy cập"));
        }

        Optional<Bookmark> bookmarkOpt = bookmarkRepository.findById(id);
        if (bookmarkOpt.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.error("Không tìm thấy đánh dấu"));
        }

        Bookmark bookmark = bookmarkOpt.get();

        // Ownership check
        if (!bookmark.getUserId().equals(currentUser.getId())) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Không có quyền xóa đánh dấu này"));
        }

        bookmarkRepository.deleteById(id);
        log.info("[Bookmark] Xóa đánh dấu: user={}, id={}", currentUser.getId(), id);

        return ResponseEntity.ok(ApiResponse.success("Xóa đánh dấu thành công"));
    }

    // ==================== Helper ====================

    private Map<String, Object> toBookmarkMap(Bookmark b) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", b.getId().toString());
        map.put("userId", b.getUserId().toString());
        map.put("courseId", b.getCourseId().toString());
        map.put("lessonId", b.getLessonId() != null ? b.getLessonId().toString() : null);
        map.put("title", b.getTitle());
        map.put("url", b.getUrl());
        map.put("position", b.getPosition());
        map.put("metadata", b.getMetadata());
        map.put("createdAt", b.getCreatedAt() != null ? b.getCreatedAt().toString() : null);
        return map;
    }

    // ==================== Request DTOs ====================

    public record CreateBookmarkRequest(
            @NotNull(message = "Mã khóa học không được để trống")
            UUID courseId,

            UUID lessonId,

            @NotBlank(message = "Tiêu đề không được để trống")
            String title,

            @NotBlank(message = "URL không được để trống")
            String url,

            Integer position,

            Map<String, Object> metadata
    ) {}

    public record UpdateBookmarkRequest(
            @NotBlank(message = "Tiêu đề không được để trống")
            String title,

            Integer position
    ) {}
}
