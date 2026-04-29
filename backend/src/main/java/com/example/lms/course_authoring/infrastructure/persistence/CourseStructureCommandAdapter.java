package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.application.port.CourseStructureCommandPort;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Transactional
public class CourseStructureCommandAdapter implements CourseStructureCommandPort {

    private final ChapterJpaRepository chapterJpaRepository;
    private final LessonJpaRepository lessonJpaRepository;
    private final JpaCourseRepository jpaCourseRepository;

    @Override
    public ChapterSnapshot updateChapter(UUID courseId, UUID chapterId, String title, String description) {
        var chapter = findChapter(courseId, chapterId);

        if (title != null && !title.isBlank()) {
            chapter.setTitle(title.trim());
        }
        chapter.setDescription(description);

        var savedChapter = chapterJpaRepository.save(chapter);
        bumpContentVersion(courseId);
        return new ChapterSnapshot(
                savedChapter.getId(),
                savedChapter.getTitle(),
                savedChapter.getDescription(),
                savedChapter.getOrderIndex(),
                savedChapter.getCreatedAt(),
                savedChapter.getUpdatedAt()
        );
    }

    @Override
    public LessonSnapshot updateLesson(UUID courseId, UUID chapterId, UUID lessonId, LessonUpdateData data) {
        var targetChapter = findChapter(courseId, chapterId);
        var lesson = lessonJpaRepository.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Bài học", lessonId));

        var sourceChapterId = lesson.getChapterId();
        var targetChapterId = targetChapter.getId();
        var movedToAnotherChapter = !sourceChapterId.equals(targetChapterId);

        if (movedToAnotherChapter) {
            lesson.setChapterId(targetChapterId);
            lesson.setOrderIndex((int) lessonJpaRepository.countByChapterId(targetChapterId));
        }

        if (data.title() != null && !data.title().isBlank()) {
            lesson.setTitle(data.title().trim());
        }
        if (data.description() != null) {
            lesson.setDescription(data.description());
        }

        LessonJpaEntity.LessonType lessonType = parseLessonType(data.lessonType());
        if (lessonType != null) {
            lesson.setType(lessonType);
        }
        if (data.videoUrl() != null) {
            lesson.setVideoUrl(data.videoUrl());
        }
        if (data.durationMinutes() != null) {
            lesson.setDurationMinutes(data.durationMinutes());
        }
        if (data.isPreview() != null) {
            lesson.setIsFree(data.isPreview());
        }
        // Legacy support only: chỉ mutate contentBlocks khi lesson chưa có
        // section structure (legacy single-text-content layout).
        //
        // Bug fix: mergeTextContent OVERWRITES TEXT block đầu tiên với chỉ
        // {"content": data.content()} — wipe sạch title, isRequired, và mọi
        // metadata khác. Khi user edit section, click nút "Lưu thay đổi"
        // (lesson save) thay vì "Cập nhật" (section save), this.lessonContent
        // FE gửi stale/empty → BE wipe section TEXT đầu tiên → user mất sửa
        // sau F5 reload.
        //
        // Modern lessons với contentBlocks proper (≥2 blocks hoặc 1 block
        // không phải TEXT) phải dùng section endpoints để quản lý nội dung.
        // Đây là contract đúng theo DDD: lesson chỉ quản lý metadata
        // (title, type, videoUrl), sections quản lý content.
        if (data.content() != null) {
            List<ContentBlock> existing = lesson.getContentBlocks();
            boolean isLegacyLayout = existing == null
                    || existing.isEmpty()
                    || (existing.size() == 1
                        && "TEXT".equalsIgnoreCase(existing.get(0).getType()));
            if (isLegacyLayout) {
                lesson.setContentBlocks(mergeTextContent(existing, data.content()));
            }
            // Modern multi-section lesson: silently ignore lesson-level content
            // field. Sections persist via /sections/{sectionId} endpoint.
        }

        var savedLesson = lessonJpaRepository.save(lesson);
        if (movedToAnotherChapter) {
            resequenceLessons(sourceChapterId);
            resequenceLessons(targetChapterId);
            savedLesson = lessonJpaRepository.findById(lessonId).orElse(savedLesson);
        }
        bumpContentVersion(courseId);

        return new LessonSnapshot(
                savedLesson.getId(),
                savedLesson.getTitle(),
                savedLesson.getDescription(),
                extractTextContent(savedLesson.getContentBlocks()),
                savedLesson.getVideoUrl(),
                savedLesson.getType() != null ? savedLesson.getType().name() : null,
                savedLesson.getOrderIndex(),
                savedLesson.getDurationMinutes(),
                data.isRequired(),
                savedLesson.getIsFree(),
                savedLesson.getContentBlocks() != null ? savedLesson.getContentBlocks().size() : 0,
                savedLesson.getCreatedAt(),
                savedLesson.getUpdatedAt()
        );
    }

    @Override
    public List<UUID> listLessonIds(UUID courseId, UUID chapterId) {
        findChapter(courseId, chapterId);
        return lessonJpaRepository.findByChapterIdOrderByOrderIndex(chapterId).stream()
                .map(LessonJpaEntity::getId)
                .toList();
    }

    @Override
    public void deleteChapter(UUID courseId, UUID chapterId) {
        var chapter = findChapter(courseId, chapterId);
        var lessons = lessonJpaRepository.findByChapterIdOrderByOrderIndex(chapterId);
        lessonJpaRepository.deleteAll(lessons);
        chapterJpaRepository.delete(chapter);
        resequenceChapters(courseId);
        bumpContentVersion(courseId);
    }

    @Override
    public void deleteLesson(UUID courseId, UUID chapterId, UUID lessonId) {
        var chapter = findChapter(courseId, chapterId);
        var lesson = lessonJpaRepository.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Bài học", lessonId));
        if (!lesson.getChapterId().equals(chapter.getId())) {
            throw new EntityNotFoundException("Bài học", lessonId);
        }

        lessonJpaRepository.delete(lesson);
        resequenceLessons(chapterId);
        bumpContentVersion(courseId);
    }

    /**
     * Increment content_version on the course whenever structure changes.
     * Used by PWA to detect stale offline content.
     */
    private void bumpContentVersion(UUID courseId) {
        jpaCourseRepository.findById(courseId).ifPresent(course -> {
            course.incrementContentVersion();
            jpaCourseRepository.save(course);
        });
    }

    private com.example.lms.course_authoring.infrastructure.persistence.entity.ChapterJpaEntity findChapter(UUID courseId, UUID chapterId) {
        var chapter = chapterJpaRepository.findById(chapterId)
                .orElseThrow(() -> new EntityNotFoundException("Chương", chapterId));
        if (!chapter.getCourseId().equals(courseId)) {
            throw new EntityNotFoundException("Chương", chapterId);
        }
        return chapter;
    }

    private void resequenceChapters(UUID courseId) {
        var chapters = chapterJpaRepository.findByCourseIdOrderByOrderIndex(courseId);
        for (int i = 0; i < chapters.size(); i++) {
            chapters.get(i).setOrderIndex(i);
        }
        chapterJpaRepository.saveAll(chapters);
    }

    private void resequenceLessons(UUID chapterId) {
        var lessons = lessonJpaRepository.findByChapterIdOrderByOrderIndex(chapterId);
        for (int i = 0; i < lessons.size(); i++) {
            lessons.get(i).setOrderIndex(i);
        }
        lessonJpaRepository.saveAll(lessons);
    }

    private LessonJpaEntity.LessonType parseLessonType(String lessonType) {
        if (lessonType == null || lessonType.isBlank()) {
            return null;
        }
        try {
            return LessonJpaEntity.LessonType.valueOf(lessonType.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private List<ContentBlock> mergeTextContent(List<ContentBlock> existingBlocks, String content) {
        List<ContentBlock> blocks = existingBlocks != null
                ? new ArrayList<>(existingBlocks)
                : new ArrayList<>();

        for (int i = 0; i < blocks.size(); i++) {
            ContentBlock block = blocks.get(i);
            if ("TEXT".equalsIgnoreCase(block.getType())) {
                // Preserve existing data fields (title, isRequired, etc.); chỉ
                // override "content" field. Trước đây Map.of("content", content)
                // wipe sạch metadata → bug data loss. Defensive với cả legacy
                // path nếu legacy block đã có thêm fields.
                Map<String, Object> mergedData = new java.util.LinkedHashMap<>();
                if (block.getData() != null) {
                    mergedData.putAll(block.getData());
                }
                mergedData.put("content", content);
                blocks.set(i, ContentBlock.of(block.getId(), "TEXT", mergedData));
                return blocks;
            }
        }

        blocks.add(0, ContentBlock.create("TEXT", Map.of("content", content)));
        return blocks;
    }

    private String extractTextContent(List<ContentBlock> contentBlocks) {
        if (contentBlocks == null) {
            return null;
        }

        for (ContentBlock block : contentBlocks) {
            if ("TEXT".equalsIgnoreCase(block.getType()) && block.getData() != null) {
                Object content = block.getData().get("content");
                if (content instanceof String value) {
                    return value;
                }
            }
        }

        return null;
    }
}
