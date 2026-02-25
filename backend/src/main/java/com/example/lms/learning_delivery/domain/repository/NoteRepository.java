package com.example.lms.learning_delivery.domain.repository;

import com.example.lms.learning_delivery.domain.model.Note;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository port for Note aggregate.
 * Domain layer — implementations in infrastructure layer.
 */
public interface NoteRepository {

    Note save(Note note);

    Optional<Note> findById(UUID id);

    List<Note> findByUserIdAndCourseId(UUID userId, UUID courseId);

    List<Note> findByUserId(UUID userId);

    void deleteById(UUID id);
}
