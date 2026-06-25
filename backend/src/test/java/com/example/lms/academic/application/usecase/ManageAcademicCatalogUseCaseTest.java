package com.example.lms.academic.application.usecase;

import com.example.lms.academic.application.dto.AcademicCatalogDtos.LinkSubjectCourseCommand;
import com.example.lms.academic.domain.model.AcademicSubject;
import com.example.lms.academic.domain.repository.AcademicCatalogRepository;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.exception.BusinessRuleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ManageAcademicCatalogUseCase Tests")
class ManageAcademicCatalogUseCaseTest {
    @Mock
    private AcademicCatalogRepository repository;

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private ManageAcademicCatalogUseCase useCase;

    @Test
    @DisplayName("linkSubjectCourse: rejects course from another organization")
    void linkSubjectCourse_rejectsCourseFromAnotherOrganization() {
        UUID organizationId = UUID.randomUUID();
        UUID otherOrganizationId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();

        when(repository.findSubject(organizationId, subjectId))
                .thenReturn(Optional.of(subject(subjectId, organizationId)));
        when(courseRepository.findById(courseId))
                .thenReturn(Optional.of(course(otherOrganizationId)));

        var command = new LinkSubjectCourseCommand(subjectId, courseId, true);

        assertThatThrownBy(() -> useCase.linkSubjectCourse(organizationId, command))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Course does not belong");
        verify(repository, never()).saveSubjectCourse(any());
    }

    @Test
    @DisplayName("linkSubjectCourse: links course when subject and course belong to same organization")
    void linkSubjectCourse_allowsSameOrganizationCourse() {
        UUID organizationId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();

        when(repository.findSubject(organizationId, subjectId))
                .thenReturn(Optional.of(subject(subjectId, organizationId)));
        when(courseRepository.findById(courseId))
                .thenReturn(Optional.of(course(organizationId)));
        when(repository.subjectCourseExists(organizationId, subjectId, courseId)).thenReturn(false);
        when(repository.saveSubjectCourse(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = useCase.linkSubjectCourse(
                organizationId,
                new LinkSubjectCourseCommand(subjectId, courseId, true));

        assertThat(response.organizationId()).isEqualTo(organizationId);
        assertThat(response.subjectId()).isEqualTo(subjectId);
        assertThat(response.courseId()).isEqualTo(courseId);
        assertThat(response.primary()).isTrue();
    }

    private AcademicSubject subject(UUID id, UUID organizationId) {
        return new AcademicSubject(
                id,
                organizationId,
                null,
                "NAV101",
                "Navigation",
                3,
                "ACTIVE",
                Instant.now(),
                null);
    }

    private Course course(UUID organizationId) {
        Course course = Course.create(
                CourseCode.of("NAV101"),
                "Navigation Basics",
                "Core navigation course",
                UUID.randomUUID());
        course.assignOrganization(organizationId);
        return course;
    }
}
