package com.example.lms.communication.infrastructure.persistence;

import com.example.lms.communication.domain.model.Announcement;
import com.example.lms.communication.domain.repository.AnnouncementRepository;
import com.example.lms.communication.infrastructure.persistence.entity.AnnouncementJpaEntity;
import com.example.lms.communication.infrastructure.persistence.repository.AnnouncementJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AnnouncementRepositoryAdapter implements AnnouncementRepository {

    private final AnnouncementJpaRepository jpaRepo;

    @Override
    public Announcement save(Announcement announcement) {
        AnnouncementJpaEntity entity = toEntity(announcement);
        AnnouncementJpaEntity saved = jpaRepo.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Announcement> findById(UUID id) {
        return jpaRepo.findById(id).map(this::toDomain);
    }

    @Override
    public List<Announcement> findByCourseId(UUID courseId) {
        return jpaRepo.findByCourseIdOrderByPublishedAtDesc(courseId)
                .stream().map(this::toDomain).toList();
    }

    @Override
    public List<Announcement> findByCourseIds(List<UUID> courseIds) {
        return jpaRepo.findByCourseIdInOrderByPublishedAtDesc(courseIds)
                .stream().map(this::toDomain).toList();
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepo.deleteById(id);
    }

    private AnnouncementJpaEntity toEntity(Announcement a) {
        AnnouncementJpaEntity e = new AnnouncementJpaEntity();
        e.setId(a.getId());
        e.setCourseId(a.getCourseId());
        e.setAuthorId(a.getAuthorId());
        e.setTitle(a.getTitle());
        e.setContent(a.getContent());
        e.setPriority(AnnouncementJpaEntity.Priority.valueOf(a.getPriority().name()));
        e.setTargetType(AnnouncementJpaEntity.TargetType.valueOf(a.getTargetType().name()));
        e.setPublishedAt(a.getPublishedAt());
        e.setUpdatedAt(a.getUpdatedAt());
        return e;
    }

    private Announcement toDomain(AnnouncementJpaEntity e) {
        return Announcement.reconstitute(
                e.getId(), e.getCourseId(), e.getAuthorId(),
                e.getTitle(), e.getContent(),
                Announcement.Priority.valueOf(e.getPriority().name()),
                Announcement.TargetType.valueOf(e.getTargetType().name()),
                e.getPublishedAt(), e.getUpdatedAt()
        );
    }
}
