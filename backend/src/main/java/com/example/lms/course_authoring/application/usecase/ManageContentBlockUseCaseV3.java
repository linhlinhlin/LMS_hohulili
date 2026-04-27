package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.domain.repository.LessonRepositoryPort;
import com.example.lms.learning_delivery.infrastructure.persistence.ClassTeacherJpaRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Use case for managing Content Blocks (Sections) within a Lesson.
 * Ownership verification ensures only the course teacher, co-teacher, or admin can modify content.
 */
@Service
@RequiredArgsConstructor
public class ManageContentBlockUseCaseV3 {

    private final LessonRepositoryPort lessonRepository;
    private final CourseRepository courseRepository;
    private final CourseDraftMutationUseCase courseDraftMutationUseCase;
    private final ClassTeacherJpaRepository classTeacherJpaRepository;

    @Transactional
    public ContentBlock addBlock(UUID lessonId, String type, Map<String, Object> data, UUID userId, boolean isAdmin) {
        verifyOwnership(lessonId, userId, isAdmin);
        courseDraftMutationUseCase.requireEditableCourseByLesson(lessonId);

        List<ContentBlock> blocks = lessonRepository.getContentBlocks(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson", lessonId));

        ContentBlock block = ContentBlock.builder()
                .id(UUID.randomUUID().toString())
                .type(type)
                .data(data)
                .build();

        List<ContentBlock> updated = new ArrayList<>(blocks);
        updated.add(block);
        lessonRepository.saveContentBlocks(lessonId, updated);
        courseDraftMutationUseCase.markCourseChangedByLesson(lessonId);

        return block;
    }

    @Transactional
    public ContentBlock updateBlock(UUID lessonId, String blockId, Map<String, Object> data, UUID userId, boolean isAdmin) {
        verifyOwnership(lessonId, userId, isAdmin);
        courseDraftMutationUseCase.requireEditableCourseByLesson(lessonId);

        List<ContentBlock> blocks = lessonRepository.getContentBlocks(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson", lessonId));

        int blockIndex = -1;
        ContentBlock existingBlock = null;
        for (int i = 0; i < blocks.size(); i++) {
            if (blocks.get(i).getId().equals(blockId)) {
                blockIndex = i;
                existingBlock = blocks.get(i);
                break;
            }
        }

        if (blockIndex == -1 || existingBlock == null) {
            throw new EntityNotFoundException("ContentBlock", blockId);
        }

        // SOTA defensive: partial-update MERGE semantics (RFC 7396 JSON Merge Patch).
        // Trước đây replace toàn bộ data Map, gây silent data loss khi FE bug
        // gửi minimal payload (e.g., NGSW cache lệch giữa versions).
        // Section dc5675f0 (2026-04-27) bị wipe title vì FE gửi {content: ""} only.
        // Merge approach: existing data + FE override → preserve fields FE không gửi.
        // KHÔNG có downside: FE intent muốn clear content vẫn pass through (set "").
        Map<String, Object> mergedData = new java.util.LinkedHashMap<>();
        if (existingBlock.getData() != null) {
            mergedData.putAll(existingBlock.getData());
        }
        mergedData.putAll(data);

        ContentBlock updatedBlock = existingBlock.withData(mergedData);
        List<ContentBlock> updated = new ArrayList<>(blocks);
        updated.set(blockIndex, updatedBlock);
        lessonRepository.saveContentBlocks(lessonId, updated);
        courseDraftMutationUseCase.markCourseChangedByLesson(lessonId);

        return updatedBlock;
    }

    @Transactional(readOnly = true)
    public List<ContentBlock> getBlocks(UUID lessonId) {
        return lessonRepository.getContentBlocks(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson", lessonId));
    }

    @Transactional
    public void saveBlocks(UUID lessonId, List<ContentBlock> blocks) {
        courseDraftMutationUseCase.requireEditableCourseByLesson(lessonId);
        lessonRepository.saveContentBlocks(lessonId, blocks);
        courseDraftMutationUseCase.markCourseChangedByLesson(lessonId);
    }

    /**
     * Patch specific fields in a ContentBlock's data map (async conversion updates).
     * Does NOT require ownership check — called from background thread after save.
     */
    @Transactional
    public void patchBlockData(UUID lessonId, String blockId, Map<String, Object> patch) {
        List<ContentBlock> blocks = lessonRepository.getContentBlocks(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson", lessonId));
        blocks.stream()
                .filter(b -> b.getId().equals(blockId))
                .findFirst()
                .ifPresent(block -> {
                    block.getData().putAll(patch);
                    lessonRepository.saveContentBlocks(lessonId, blocks);
                });
    }

    @Transactional
    public void deleteBlock(UUID lessonId, String blockId, UUID userId, boolean isAdmin) {
        verifyOwnership(lessonId, userId, isAdmin);
        courseDraftMutationUseCase.requireEditableCourseByLesson(lessonId);

        List<ContentBlock> blocks = lessonRepository.getContentBlocks(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson", lessonId));

        List<ContentBlock> updated = new ArrayList<>(blocks);
        boolean removed = updated.removeIf(b -> b.getId().equals(blockId));
        if (removed) {
            lessonRepository.saveContentBlocks(lessonId, updated);
            courseDraftMutationUseCase.markCourseChangedByLesson(lessonId);
        } else {
            throw new EntityNotFoundException("ContentBlock", blockId);
        }
    }

    /**
     * Verify that the user owns the course containing the lesson, or is an admin.
     */
    private void verifyOwnership(UUID lessonId, UUID userId, boolean isAdmin) {
        if (isAdmin) return;
        var course = courseRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Course for lesson", lessonId));
        if (!course.getTeacherId().equals(userId)
                && !classTeacherJpaRepository.existsByTeacherIdAndCourseId(userId, course.getId())) {
            throw new AccessDeniedException("You don't have permission to modify this content");
        }
    }
}
