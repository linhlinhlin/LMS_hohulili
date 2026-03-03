package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.repository.CourseTagRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssignCourseTagsUseCase {

    private static final int MAX_TAGS = 5;
    private final CourseTagRepository tagRepo;

    @Transactional
    public void setTags(UUID courseId, Set<UUID> tagIds) {
        if (tagIds.size() > MAX_TAGS) {
            throw new BusinessRuleException("MAX_TAGS_EXCEEDED",
                    "Toi da " + MAX_TAGS + " tags cho moi khoa hoc");
        }
        tagRepo.assignTagsToCourse(courseId, tagIds);
    }
}
