package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseSummaryResponse;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.domain.valueobject.CourseCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests for ListCoursesUseCase.
 *
 * Verifies:
 * - executeByTeacher returns teacher's courses
 * - executeApproved returns approved courses
 * - executeApprovedWithSearch returns filtered results
 * - executePending returns pending courses
 * - Empty page returned when no results
 * - Paging parameters are forwarded correctly to repository
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ListCoursesUseCase Tests")
class ListCoursesUseCaseTest {

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private ListCoursesUseCase useCase;

    private UUID teacherId;
    private Pageable pageable;
    private Course course1;
    private Course course2;

    @BeforeEach
    void setUp() {
        teacherId = UUID.randomUUID();
        pageable = PageRequest.of(0, 10);

        course1 = Course.create(
                CourseCode.of("LST-001"),
                "Nhập môn Hàng hải",
                "Mô tả khóa học hàng hải",
                teacherId
        );

        course2 = Course.create(
                CourseCode.of("LST-002"),
                "An toàn Hàng hải",
                "Mô tả khóa học an toàn",
                teacherId
        );
    }

    @Nested
    @DisplayName("Danh sách khóa học theo giảng viên")
    class ByTeacher {

        @Test
        @DisplayName("Should return teacher's courses mapped to CourseSummaryResponse")
        void shouldReturnTeacherCourses() {
            // Given
            Page<Course> coursePage = new PageImpl<>(List.of(course1, course2), pageable, 2);
            when(courseRepository.findByTeacherId(teacherId, pageable)).thenReturn(coursePage);

            // When
            Page<CourseSummaryResponse> result = useCase.executeByTeacher(teacherId, pageable);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(2);
            assertThat(result.getContent().get(0).title()).isEqualTo("Nhập môn Hàng hải");
            assertThat(result.getContent().get(0).code()).isEqualTo("LST-001");
            assertThat(result.getContent().get(0).teacherId()).isEqualTo(teacherId);
            assertThat(result.getContent().get(1).title()).isEqualTo("An toàn Hàng hải");

            verify(courseRepository).findByTeacherId(teacherId, pageable);
        }
    }

    @Nested
    @DisplayName("Danh sách khóa học đã duyệt")
    class ApprovedCourses {

        @Test
        @DisplayName("Should return approved courses")
        void shouldReturnApprovedCourses() {
            // Given
            Page<Course> coursePage = new PageImpl<>(List.of(course1), pageable, 1);
            when(courseRepository.findApproved(pageable)).thenReturn(coursePage);

            // When
            Page<CourseSummaryResponse> result = useCase.executeApproved(pageable);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).code()).isEqualTo("LST-001");
            assertThat(result.getTotalElements()).isEqualTo(1);

            verify(courseRepository).findApproved(pageable);
        }
    }

    @Nested
    @DisplayName("Tìm kiếm khóa học đã duyệt")
    class ApprovedWithSearch {

        @Test
        @DisplayName("Should return approved courses matching search query")
        void shouldReturnApprovedCoursesWithSearch() {
            // Given
            String searchQuery = "Hàng hải";
            Page<Course> coursePage = new PageImpl<>(List.of(course1, course2), pageable, 2);
            when(courseRepository.findApprovedByTitleContaining(searchQuery, pageable)).thenReturn(coursePage);

            // When
            Page<CourseSummaryResponse> result = useCase.executeApprovedWithSearch(searchQuery, pageable);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(2);

            verify(courseRepository).findApprovedByTitleContaining(searchQuery, pageable);
        }

        @Test
        @DisplayName("Should fall back to findApproved when search is blank")
        void shouldFallBackWhenSearchIsBlank() {
            // Given
            Page<Course> coursePage = new PageImpl<>(List.of(course1), pageable, 1);
            when(courseRepository.findApproved(pageable)).thenReturn(coursePage);

            // When
            Page<CourseSummaryResponse> result = useCase.executeApprovedWithSearch("   ", pageable);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);

            verify(courseRepository).findApproved(pageable);
        }
    }

    @Nested
    @DisplayName("Danh sách khóa học chờ duyệt")
    class PendingCourses {

        @Test
        @DisplayName("Should return pending courses for admin review")
        void shouldReturnPendingCourses() {
            // Given
            Page<Course> coursePage = new PageImpl<>(List.of(course1), pageable, 1);
            when(courseRepository.findPending(pageable)).thenReturn(coursePage);

            // When
            Page<CourseSummaryResponse> result = useCase.executePending(pageable);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).title()).isEqualTo("Nhập môn Hàng hải");

            verify(courseRepository).findPending(pageable);
        }
    }

    @Nested
    @DisplayName("Kết quả trống")
    class EmptyResults {

        @Test
        @DisplayName("Should return empty page when no courses match")
        void shouldReturnEmptyPageWhenNoCourses() {
            // Given
            Page<Course> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            when(courseRepository.findByTeacherId(teacherId, pageable)).thenReturn(emptyPage);

            // When
            Page<CourseSummaryResponse> result = useCase.executeByTeacher(teacherId, pageable);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getContent()).isEmpty();
            assertThat(result.getTotalElements()).isZero();
            assertThat(result.getTotalPages()).isZero();
        }
    }

    @Nested
    @DisplayName("Phân trang")
    class Pagination {

        @Test
        @DisplayName("Should pass paging parameters correctly to repository")
        void shouldPassPagingParametersCorrectly() {
            // Given
            Pageable customPageable = PageRequest.of(2, 5); // page 2, size 5
            Page<Course> coursePage = new PageImpl<>(List.of(course1), customPageable, 11);
            when(courseRepository.findByTeacherId(eq(teacherId), eq(customPageable))).thenReturn(coursePage);

            // When
            Page<CourseSummaryResponse> result = useCase.executeByTeacher(teacherId, customPageable);

            // Then
            assertThat(result.getNumber()).isEqualTo(2);
            assertThat(result.getSize()).isEqualTo(5);
            assertThat(result.getTotalElements()).isEqualTo(11);
            // 11 total elements / 5 per page = 3 pages
            assertThat(result.getTotalPages()).isEqualTo(3);

            verify(courseRepository).findByTeacherId(teacherId, customPageable);
        }
    }
}
