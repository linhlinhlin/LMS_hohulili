package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.domain.model.Note;
import com.example.lms.learning_delivery.domain.repository.NoteRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.infrastructure.web.ApiResponse;
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

import java.util.*;

@Slf4j
@Tag(name = "Notes V3", description = "API ghi chú học tập")
@RestController
@RequestMapping("/api/v3/notes")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class NoteControllerV3 {

    private final NoteRepository noteRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lấy danh sách ghi chú")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listNotes(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @RequestParam(required = false) UUID courseId) {

        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        }

        List<Note> notes;
        if (courseId != null) {
            notes = noteRepository.findByUserIdAndCourseId(currentUser.getId(), courseId);
        } else {
            notes = noteRepository.findByUserId(currentUser.getId());
        }

        List<Map<String, Object>> result = notes.stream().map(this::toNoteMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Tải ghi chú thành công"));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Transactional
    @Operation(summary = "Tạo ghi chú mới")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createNote(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody CreateNoteRequest request) {

        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        }

        Note note = Note.create(
                currentUser.getId(),
                request.courseId(),
                request.lessonId(),
                request.title(),
                request.content(),
                request.tags()
        );

        Note saved = noteRepository.save(note);
        log.info("[Note] Tạo ghi chú: user={}, course={}", currentUser.getId(), request.courseId());
        return ResponseEntity.ok(ApiResponse.success(toNoteMap(saved), "Tạo ghi chú thành công"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    @Operation(summary = "Cập nhật ghi chú")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateNote(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateNoteRequest request) {

        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        }

        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Note", id));

        if (!note.isOwnedBy(currentUser.getId())) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Bạn không có quyền sửa ghi chú này"));
        }

        note.update(request.title(), request.content(), request.tags());
        Note saved = noteRepository.save(note);
        return ResponseEntity.ok(ApiResponse.success(toNoteMap(saved), "Cập nhật ghi chú thành công"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    @Operation(summary = "Xóa ghi chú")
    public ResponseEntity<ApiResponse<Void>> deleteNote(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID id) {

        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        }

        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Note", id));

        if (!note.isOwnedBy(currentUser.getId())) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Bạn không có quyền xóa ghi chú này"));
        }

        noteRepository.deleteById(id);
        log.info("[Note] Xóa ghi chú: id={}, user={}", id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa ghi chú thành công"));
    }

    private Map<String, Object> toNoteMap(Note note) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", note.getId().toString());
        map.put("userId", note.getUserId().toString());
        map.put("courseId", note.getCourseId().toString());
        map.put("lessonId", note.getLessonId() != null ? note.getLessonId().toString() : null);
        map.put("title", note.getTitle());
        map.put("content", note.getContent());
        map.put("tags", note.getTags());
        map.put("isPublic", note.isPublic());
        map.put("createdAt", note.getCreatedAt() != null ? note.getCreatedAt().toString() : null);
        map.put("updatedAt", note.getUpdatedAt() != null ? note.getUpdatedAt().toString() : null);
        return map;
    }

    // Request DTOs
    public record CreateNoteRequest(
            @NotNull(message = "Mã khóa học không được để trống") UUID courseId,
            UUID lessonId,
            @NotBlank(message = "Tiêu đề không được để trống") String title,
            String content,
            List<String> tags
    ) {}

    public record UpdateNoteRequest(
            String title,
            String content,
            List<String> tags
    ) {}
}
