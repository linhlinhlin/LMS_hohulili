package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.repository.CourseCategoryRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ManageCourseCategoryUseCase Tests")
class ManageCourseCategoryUseCaseTest {

    @Mock
    private CourseCategoryRepository categoryRepository;

    @Test
    @DisplayName("getApprovedCourseCountsByCategory delegates to repository (issue #189)")
    void getApprovedCourseCountsByCategoryDelegates() {
        ManageCourseCategoryUseCase useCase = new ManageCourseCategoryUseCase(categoryRepository);
        UUID catA = UUID.randomUUID();
        UUID catB = UUID.randomUUID();
        Map<UUID, Long> stub = Map.of(catA, 47L, catB, 12L);
        when(categoryRepository.countApprovedCoursesByCategory()).thenReturn(stub);

        Map<UUID, Long> result = useCase.getApprovedCourseCountsByCategory();

        assertThat(result).containsAllEntriesOf(stub);
        verify(categoryRepository).countApprovedCoursesByCategory();
    }

    @Test
    @DisplayName("Returns empty map when no categories have APPROVED courses (no rollup, no synthetic data)")
    void getApprovedCourseCountsByCategoryEmpty() {
        ManageCourseCategoryUseCase useCase = new ManageCourseCategoryUseCase(categoryRepository);
        when(categoryRepository.countApprovedCoursesByCategory()).thenReturn(Map.of());

        Map<UUID, Long> result = useCase.getApprovedCourseCountsByCategory();

        assertThat(result).isEmpty();
    }
}
