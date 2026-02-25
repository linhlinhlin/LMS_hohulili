package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.Note;
import com.example.lms.learning_delivery.domain.repository.NoteRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.NoteJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.NoteJpaRepository;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class NoteRepositoryAdapter implements NoteRepository {

    private final NoteJpaRepository jpaRepository;

    public NoteRepositoryAdapter(NoteJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Note save(Note note) {
        Optional<NoteJpaEntity> existing = jpaRepository.findById(note.getId());

        NoteJpaEntity entity;
        if (existing.isPresent()) {
            entity = existing.get();
            entity.setTitle(note.getTitle());
            entity.setContent(note.getContent());
            entity.setTags(note.getTags().toArray(new String[0]));
        } else {
            entity = NoteJpaEntity.builder()
                    .id(note.getId())
                    .userId(note.getUserId())
                    .courseId(note.getCourseId())
                    .lessonId(note.getLessonId())
                    .title(note.getTitle())
                    .content(note.getContent())
                    .tags(note.getTags().toArray(new String[0]))
                    .isPublic(note.isPublic())
                    .build();
        }

        NoteJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Note> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public List<Note> findByUserIdAndCourseId(UUID userId, UUID courseId) {
        return jpaRepository.findByUserIdAndCourseIdOrderByUpdatedAtDesc(userId, courseId)
                .stream().map(this::toDomain).toList();
    }

    @Override
    public List<Note> findByUserId(UUID userId) {
        return jpaRepository.findByUserIdOrderByUpdatedAtDesc(userId)
                .stream().map(this::toDomain).toList();
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    private Note toDomain(NoteJpaEntity entity) {
        return Note.reconstitute(
                entity.getId(),
                entity.getUserId(),
                entity.getCourseId(),
                entity.getLessonId(),
                entity.getTitle(),
                entity.getContent(),
                entity.getTags() != null ? Arrays.asList(entity.getTags()) : List.of(),
                entity.isPublic(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
