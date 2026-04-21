package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.application.usecase.*;
import com.example.lms.learning_delivery.infrastructure.persistence.ClassTeacherJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Security tests for ClassControllerV3 ownership checks (P0-13).
 */
@ExtendWith(MockitoExtension.class)
class ClassControllerSecurityTest {
    private static final String COURSE_ACCESS_DENIED_MESSAGE = "quyền truy cập khóa học";

    @Mock private CreateLearningClassUseCaseV3 createLearningClassUseCase;
    @Mock private UpdateLearningClassUseCase updateLearningClassUseCase;
    @Mock private DeleteLearningClassUseCase deleteLearningClassUseCase;
    @Mock private GetLearningClassByIdUseCase getLearningClassByIdUseCase;
    @Mock private EnrollStudentByEmailUseCase enrollStudentByEmailUseCase;
    @Mock private GetClassStudentsUseCase getClassStudentsUseCase;
    @Mock private DropStudentUseCase dropStudentUseCase;
    @Mock private JpaLearningClassRepository classJpaRepository;
    @Mock private JpaCourseRepository courseJpaRepository;
    @Mock private com.example.lms.course_authoring.infrastructure.persistence.repository.CoursePublicationJpaRepository coursePublicationJpaRepository;
    @Mock private UserJpaRepository userJpaRepository;
    @Mock private JpaEnrollmentRepository enrollmentJpaRepository;
    @Mock private ManageClassTeachersUseCase manageClassTeachersUseCase;
    @Mock private ClassTeacherJpaRepository classTeacherJpaRepository;

    @InjectMocks
    private ClassControllerV3 controller;

    private UUID courseId;
    private UUID teacherId;
    private UUID otherTeacherId;
    private UserJpaEntity otherTeacher;
    private CourseJpaEntity course;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        teacherId = UUID.randomUUID();
        otherTeacherId = UUID.randomUUID();

        otherTeacher = mock(UserJpaEntity.class);
        lenient().when(otherTeacher.getId()).thenReturn(otherTeacherId);
        lenient().when(otherTeacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        course = mock(CourseJpaEntity.class);
        lenient().when(course.getTeacherId()).thenReturn(teacherId);
        lenient().when(course.getDeliveryMode()).thenReturn(CourseJpaEntity.DeliveryMode.INSTRUCTOR_LED);
    }

    @Test
    @DisplayName("createClass: Từ chối khi teacher không sở hữu khóa học")
    void createClass_verifiesCourseOwnership() {
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        var request = new ClassControllerV3.CreateClassRequest();
        request.setName("Lớp 1A");
        request.setCourseId(courseId.toString());

        assertThatThrownBy(() -> controller.createClass(request, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining(COURSE_ACCESS_DENIED_MESSAGE);
    }

    @Test
    @DisplayName("updateClass: Từ chối khi teacher không sở hữu khóa học")
    void createClass_rejectsSelfPacedCourse() {
        var owner = mock(UserJpaEntity.class);
        when(owner.getId()).thenReturn(teacherId);
        when(owner.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);
        when(course.getDeliveryMode()).thenReturn(CourseJpaEntity.DeliveryMode.SELF_PACED);
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        var request = new ClassControllerV3.CreateClassRequest();
        request.setName("Lá»›p 1A");
        request.setCourseId(courseId.toString());

        assertThatThrownBy(() -> controller.createClass(request, owner))
                .isInstanceOf(com.example.lms.shared.exception.BusinessRuleException.class)
                .hasMessageContaining("Quan ly lop");
    }

    @Test
    @DisplayName("updateClass: Tá»« chá»‘i khi teacher khÃ´ng sá»Ÿ há»¯u khÃ³a há»c")
    void updateClass_verifiesCourseOwnership() {
        UUID classId = UUID.randomUUID();
        var classEntity = mock(LearningClassJpaEntity.class);
        when(classEntity.getCourseId()).thenReturn(courseId);
        when(classJpaRepository.findById(classId)).thenReturn(Optional.of(classEntity));
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        var request = new ClassControllerV3.UpdateClassRequest();

        assertThatThrownBy(() -> controller.updateClass(classId.toString(), request, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining(COURSE_ACCESS_DENIED_MESSAGE);
    }

    @Test
    @DisplayName("deleteClass: Từ chối khi teacher không sở hữu khóa học")
    void deleteClass_verifiesCourseOwnership() {
        UUID classId = UUID.randomUUID();
        var classEntity = mock(LearningClassJpaEntity.class);
        when(classEntity.getCourseId()).thenReturn(courseId);
        when(classJpaRepository.findById(classId)).thenReturn(Optional.of(classEntity));
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.deleteClass(classId.toString(), otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining(COURSE_ACCESS_DENIED_MESSAGE);
    }

    // ================================================================================================
    // S85: Read endpoint IDOR tests
    // ================================================================================================

    @Test
    @DisplayName("getClassesByCourse: Từ chối khi teacher không sở hữu khóa học")
    void getClassesByCourse_rejectsNonOwner() {
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.getClassesByCourse(courseId, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining(COURSE_ACCESS_DENIED_MESSAGE);
    }

    @Test
    @DisplayName("searchClassesByCourse: Từ chối khi teacher không sở hữu khóa học")
    void searchClassesByCourse_rejectsNonOwner() {
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.searchClassesByCourse(courseId, otherTeacher, null, null, null, 0, 10))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining(COURSE_ACCESS_DENIED_MESSAGE);
    }

    @Test
    @DisplayName("getClassById: Từ chối khi teacher không sở hữu khóa học")
    void getClassById_rejectsNonOwner() {
        UUID classId = UUID.randomUUID();
        var classEntity = mock(LearningClassJpaEntity.class);
        when(classEntity.getCourseId()).thenReturn(courseId);
        when(classJpaRepository.findById(classId)).thenReturn(Optional.of(classEntity));
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.getClassById(classId.toString(), otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining(COURSE_ACCESS_DENIED_MESSAGE);
    }

    @Test
    @DisplayName("getClassStudents: Từ chối khi teacher không sở hữu khóa học")
    void getClassStudents_rejectsNonOwner() {
        UUID classId = UUID.randomUUID();
        var classEntity = mock(LearningClassJpaEntity.class);
        when(classEntity.getCourseId()).thenReturn(courseId);
        when(classJpaRepository.findById(classId)).thenReturn(Optional.of(classEntity));
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.getClassStudents(classId.toString(), 0, 10, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining(COURSE_ACCESS_DENIED_MESSAGE);
    }

    @Test
    @DisplayName("getClassesByCourse: ADMIN bỏ qua kiểm tra quyền sở hữu")
    void getClassesByCourse_rejectsSelfPacedCourse() {
        var owner = mock(UserJpaEntity.class);
        when(owner.getId()).thenReturn(teacherId);
        when(owner.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);
        when(course.getDeliveryMode()).thenReturn(CourseJpaEntity.DeliveryMode.SELF_PACED);
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> controller.getClassesByCourse(courseId, owner))
                .isInstanceOf(com.example.lms.shared.exception.BusinessRuleException.class)
                .hasMessageContaining("Quan ly lop");
    }

    @Test
    @DisplayName("getClassesByCourse: ADMIN bá» qua kiá»ƒm tra quyá»n sá»Ÿ há»¯u")
    void getClassesByCourse_allowsAdmin() {
        var admin = mock(UserJpaEntity.class);
        when(admin.getRole()).thenReturn(UserJpaEntity.UserRole.ADMIN);
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(classJpaRepository.findByCourseId(courseId)).thenReturn(List.of());

        assertThatCode(() -> controller.getClassesByCourse(courseId, admin))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("getClassesByCourse: Chủ sở hữu khóa học được truy cập")
    void getClassesByCourse_allowsOwner() {
        var owner = mock(UserJpaEntity.class);
        when(owner.getId()).thenReturn(teacherId);
        when(owner.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(classJpaRepository.findByCourseId(courseId)).thenReturn(List.of());

        assertThatCode(() -> controller.getClassesByCourse(courseId, owner))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("getClassesByCourse: Trả đủ metadata lớp học cho teacher UI")
    void getClassesByCourse_returnsClassMetadataForTeacherUi() {
        var owner = mock(UserJpaEntity.class);
        when(owner.getId()).thenReturn(teacherId);
        when(owner.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        UUID classId = UUID.randomUUID();
        UUID assignedTeacherId = UUID.randomUUID();

        LearningClassJpaEntity classEntity = LearningClassJpaEntity.builder()
                .id(classId)
                .courseId(courseId)
                .teacherId(assignedTeacherId)
                .name("Lớp HK1")
                .code("CLS-001")
                .status(LearningClassJpaEntity.ClassStatus.OPEN)
                .scheduleType(LearningClassJpaEntity.ScheduleType.SEMESTER)
                .semester("HK1-2026")
                .maxStudents(35)
                .build();

        var assignedTeacher = mock(UserJpaEntity.class);
        when(assignedTeacher.getId()).thenReturn(assignedTeacherId);
        when(assignedTeacher.getFullName()).thenReturn("Nguyen Van A");

        when(classJpaRepository.findByCourseId(courseId)).thenReturn(List.of(classEntity));
        when(userJpaRepository.findAllById(Set.of(assignedTeacherId))).thenReturn(List.of(assignedTeacher));
        when(enrollmentJpaRepository.countByClassId(classId)).thenReturn(12L);

        var response = controller.getClassesByCourse(courseId, owner);
        @SuppressWarnings("unchecked")
        var data = (List<Map<String, Object>>) response.getBody().getData();

        assertThat(data).hasSize(1);
        assertThat(data.get(0)).containsEntry("teacherName", "Nguyen Van A");
        assertThat(data.get(0)).containsEntry("scheduleType", "SEMESTER");
        assertThat(data.get(0)).containsEntry("studentCount", 12L);
    }

    @Test
    @DisplayName("updateClass: Chuyển đầy đủ teacher và schedule metadata xuống use case")
    void updateClass_forwardsTeacherAndScheduleMetadata() {
        var owner = mock(UserJpaEntity.class);
        when(owner.getId()).thenReturn(teacherId);
        when(owner.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);
        when(courseJpaRepository.findById(courseId)).thenReturn(Optional.of(course));

        UUID classId = UUID.randomUUID();
        UUID newTeacherId = UUID.randomUUID();
        var classEntity = mock(LearningClassJpaEntity.class);
        when(classEntity.getCourseId()).thenReturn(courseId);
        when(classJpaRepository.findById(classId)).thenReturn(Optional.of(classEntity));

        var request = new ClassControllerV3.UpdateClassRequest();
        request.setName("Lớp mới");
        request.setTeacherId(newTeacherId.toString());
        request.setScheduleType("SEMESTER");
        request.setSemester("HK2-2026");
        request.setMaxStudents(40);
        request.setStartDate("2026-01-20T00:00:00Z");
        request.setEndDate("2026-05-30T00:00:00Z");

        when(updateLearningClassUseCase.execute(any()))
                .thenReturn(new com.example.lms.learning_delivery.application.dto.LearningClassResponse(
                        classId,
                        "Lớp mới",
                        "CLS-001",
                        courseId,
                        null,
                        null,
                        newTeacherId,
                        "OPEN",
                        "SEMESTER",
                        "HK2-2026",
                        40,
                        null,
                        null,
                        null
                ));

        controller.updateClass(classId.toString(), request, owner);

        var captor = org.mockito.ArgumentCaptor.forClass(UpdateLearningClassUseCase.UpdateClassCommand.class);
        verify(updateLearningClassUseCase).execute(captor.capture());
        assertThat(captor.getValue().teacherId()).isEqualTo(newTeacherId);
        assertThat(captor.getValue().scheduleType()).isEqualTo("SEMESTER");
        assertThat(captor.getValue().semester()).isEqualTo("HK2-2026");
    }
}
