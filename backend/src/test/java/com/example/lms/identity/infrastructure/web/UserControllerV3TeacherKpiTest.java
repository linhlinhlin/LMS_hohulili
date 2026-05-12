package com.example.lms.identity.infrastructure.web;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.identity.application.usecase.UpdateUserUseCaseV3;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the teacher KPI hydration introduced in issue #190 (F-T1).
 * Verifies that the controller batches the per-teacher course-count query
 * into a single aggregate (no N+1) and that non-TEACHER rows are not
 * touched.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserControllerV3 — teacher KPI hydration (issue #190)")
class UserControllerV3TeacherKpiTest {

    @Mock private UserJpaRepository userRepository;
    @Mock private UpdateUserUseCaseV3 updateUserUseCaseV3;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JpaEnrollmentRepository enrollmentRepository;
    @Mock private JpaCourseRepository courseRepository;

    @InjectMocks private UserControllerV3 controller;

    private UserJpaEntity admin;
    private UUID teacherAId;
    private UUID teacherBId;
    private UUID studentId;

    @BeforeEach
    void setUp() {
        admin = userEntity(UUID.randomUUID(), "admin@maritime.edu", "Admin",
                UserJpaEntity.UserRole.ADMIN);
        teacherAId = UUID.randomUUID();
        teacherBId = UUID.randomUUID();
        studentId = UUID.randomUUID();
    }

    @Test
    @DisplayName("getUsers populates coursesCreated for TEACHER rows from a single batch query")
    void hydratesTeacherCoursesCreated() {
        List<UserJpaEntity> users = List.of(
                userEntity(teacherAId, "teacher-a@m.edu", "Teacher A", UserJpaEntity.UserRole.TEACHER),
                userEntity(teacherBId, "teacher-b@m.edu", "Teacher B", UserJpaEntity.UserRole.TEACHER),
                userEntity(studentId, "student@m.edu", "Student",      UserJpaEntity.UserRole.STUDENT)
        );
        when(userRepository.findAll(
                any(org.springframework.data.jpa.domain.Specification.class),
                any(PageRequest.class)
        ))
                .thenReturn(new PageImpl<>(users));

        // Teacher A has 5 courses, Teacher B has 0 (absent from the result set
        // — must default to 0 rather than throw or null).
        List<Object[]> teacherACountRow = List.<Object[]>of(new Object[]{teacherAId, 5L});
        when(courseRepository.countCoursesByTeacherIds(any()))
                .thenReturn(teacherACountRow);

        ResponseEntity<ApiResponse<Page<UserControllerV3.UserResponse>>> response =
                controller.getUsers(1, 10, null, null, null, null, null, false, admin);

        @SuppressWarnings("ConstantConditions")
        List<UserControllerV3.UserResponse> rows = response.getBody().getData().getContent();
        UserControllerV3.UserResponse teacherA = findById(rows, teacherAId);
        UserControllerV3.UserResponse teacherB = findById(rows, teacherBId);
        UserControllerV3.UserResponse student = findById(rows, studentId);

        assertThat(teacherA.getCoursesCreated()).isEqualTo(5);
        assertThat(teacherB.getCoursesCreated()).isEqualTo(0);
        // STUDENT must not be touched — coursesCreated stays at default 0.
        assertThat(student.getCoursesCreated()).isEqualTo(0);
    }

    @Test
    @DisplayName("Only TEACHER ids are sent to courseRepository — STUDENT/ADMIN rows are filtered")
    void onlyTeacherIdsSentToBatchQuery() {
        List<UserJpaEntity> users = List.of(
                userEntity(teacherAId, "teacher-a@m.edu", "Teacher A", UserJpaEntity.UserRole.TEACHER),
                userEntity(studentId, "student@m.edu", "Student",      UserJpaEntity.UserRole.STUDENT),
                userEntity(admin.getId(), "admin@m.edu", "Admin",      UserJpaEntity.UserRole.ADMIN)
        );
        when(userRepository.findAll(
                any(org.springframework.data.jpa.domain.Specification.class),
                any(PageRequest.class)
        ))
                .thenReturn(new PageImpl<>(users));
        when(courseRepository.countCoursesByTeacherIds(any())).thenReturn(List.of());

        controller.getUsers(1, 10, null, null, null, null, null, false, admin);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<UUID>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(courseRepository).countCoursesByTeacherIds(captor.capture());
        assertThat(captor.getValue()).containsExactly(teacherAId);
    }

    @Test
    @DisplayName("Skips the batch query when no TEACHER rows are present")
    void skipsBatchWhenNoTeachers() {
        List<UserJpaEntity> users = List.of(
                userEntity(studentId, "student@m.edu", "Student", UserJpaEntity.UserRole.STUDENT)
        );
        when(userRepository.findAll(
                any(org.springframework.data.jpa.domain.Specification.class),
                any(PageRequest.class)
        ))
                .thenReturn(new PageImpl<>(users));

        controller.getUsers(1, 10, null, null, null, null, null, false, admin);

        verify(courseRepository, never()).countCoursesByTeacherIds(any());
    }

    private UserJpaEntity userEntity(UUID id, String email, String name, UserJpaEntity.UserRole role) {
        UserJpaEntity user = new UserJpaEntity(
                id, email.split("@")[0], email, "pwd", name, role,
                true, Instant.now(), null);
        user.setAccountStatus("ACTIVE");
        return user;
    }

    private UserControllerV3.UserResponse findById(
            List<UserControllerV3.UserResponse> rows, UUID id) {
        return rows.stream()
                .filter(r -> id.toString().equals(r.getId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("User " + id + " not in response"));
    }
}
