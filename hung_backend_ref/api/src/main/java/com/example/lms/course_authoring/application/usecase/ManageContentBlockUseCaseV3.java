package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Map;
import java.util.UUID;

/**
 * Use case for managing Content Blocks (Sections) within a Lesson.
 */
@Service
@RequiredArgsConstructor
public class ManageContentBlockUseCaseV3 {

    private final LessonJpaRepository lessonRepository;

    @Transactional
    public ContentBlock addBlock(UUID lessonId, String type, Map<String, Object> data) {
        LessonJpaEntity lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson", lessonId));

        ContentBlock block = ContentBlock.builder()
                .id(UUID.randomUUID().toString())
                .type(type)
                .data(data)
                .build();

        if (lesson.getContentBlocks() == null) {
            lesson.setContentBlocks(new ArrayList<>());
        }
        lesson.getContentBlocks().add(block);
        
        lessonRepository.save(lesson);
        return block;
    }

    @Transactional
    public ContentBlock updateBlock(UUID lessonId, String blockId, Map<String, Object> data) {
        LessonJpaEntity lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson", lessonId));

        if (lesson.getContentBlocks() == null) {
            throw new EntityNotFoundException("ContentBlock", blockId);
        }

        ContentBlock block = lesson.getContentBlocks().stream()
                .filter(b -> b.getId().equals(blockId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("ContentBlock", blockId));

        // Update data
        block.setData(data);
        // Type is usually immutable, but we can update if needed. 
        // For now, we only update data.

        lessonRepository.save(lesson);
        return block;
    }

    @Transactional
    public void deleteBlock(UUID lessonId, String blockId) {
        LessonJpaEntity lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson", lessonId));

        if (lesson.getContentBlocks() != null) {
            boolean removed = lesson.getContentBlocks().removeIf(b -> b.getId().equals(blockId));
            if (removed) {
                lessonRepository.save(lesson);
            } else {
                 throw new EntityNotFoundException("ContentBlock", blockId);
            }
        }
    }
}
