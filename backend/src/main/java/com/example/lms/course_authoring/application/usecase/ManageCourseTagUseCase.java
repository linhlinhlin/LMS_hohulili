package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.CourseTag;
import com.example.lms.course_authoring.domain.repository.CourseTagRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ManageCourseTagUseCase {

    private final CourseTagRepository tagRepo;

    public List<CourseTag> getAll() {
        return tagRepo.findAll();
    }

    @Transactional
    public CourseTag create(String name, String slug) {
        if (tagRepo.existsByName(name))
            throw new BusinessRuleException("TAG_NAME_EXISTS", "Tag da ton tai: " + name);
        if (tagRepo.existsBySlug(slug))
            throw new BusinessRuleException("TAG_SLUG_EXISTS", "Slug da ton tai: " + slug);
        return tagRepo.save(CourseTag.create(name, slug));
    }

    @Transactional
    public CourseTag rename(UUID id, String name, String slug) {
        var tag = tagRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Tag", id));
        tag.rename(name, slug);
        return tagRepo.save(tag);
    }

    @Transactional
    public void delete(UUID id) {
        if (tagRepo.findById(id).isEmpty())
            throw new EntityNotFoundException("Tag", id);
        tagRepo.deleteById(id);
    }
}
