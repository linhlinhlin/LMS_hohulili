package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.PackageJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Security tests for PackageControllerV3 ownership checks (P0-12).
 */
@ExtendWith(MockitoExtension.class)
class PackageControllerSecurityTest {

    @Mock private PackageJpaRepository packageRepository;
    @Mock private QuestionJpaRepository questionRepository;
    @Mock private UserJpaRepository userRepository;

    @InjectMocks
    private PackageControllerV3 controller;

    private UUID packageId;
    private UUID ownerId;

    @BeforeEach
    void setUp() {
        packageId = UUID.randomUUID();
        ownerId = UUID.randomUUID();
    }

    @Test
    @DisplayName("updatePackage: Từ chối khi không phải chủ sở hữu")
    void updatePackage_rejectsNonOwner() {
        UserJpaEntity otherTeacher = mock(UserJpaEntity.class);
        when(otherTeacher.getId()).thenReturn(UUID.randomUUID());
        when(otherTeacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        PackageJpaEntity pkg = mock(PackageJpaEntity.class);
        when(pkg.getOwnerId()).thenReturn(ownerId);
        when(packageRepository.findById(packageId)).thenReturn(Optional.of(pkg));

        var request = mock(PackageControllerV3.UpdatePackageRequest.class);

        assertThatThrownBy(() -> controller.updatePackage(packageId, request, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("không sở hữu gói câu hỏi này");
    }

    @Test
    @DisplayName("deletePackage: Từ chối khi không phải chủ sở hữu")
    void deletePackage_rejectsNonOwner() {
        UserJpaEntity otherTeacher = mock(UserJpaEntity.class);
        when(otherTeacher.getId()).thenReturn(UUID.randomUUID());
        when(otherTeacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        PackageJpaEntity pkg = mock(PackageJpaEntity.class);
        when(pkg.getOwnerId()).thenReturn(ownerId);
        when(packageRepository.findById(packageId)).thenReturn(Optional.of(pkg));

        assertThatThrownBy(() -> controller.deletePackage(packageId, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("không sở hữu gói câu hỏi này");
    }

    @Test
    @DisplayName("moveQuestions: Từ chối khi không sở hữu gói đích")
    void moveQuestions_rejectsNonOwnerTarget() {
        UserJpaEntity otherTeacher = mock(UserJpaEntity.class);
        when(otherTeacher.getId()).thenReturn(UUID.randomUUID());
        when(otherTeacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        UUID targetId = UUID.randomUUID();
        PackageJpaEntity targetPkg = mock(PackageJpaEntity.class);
        when(targetPkg.getOwnerId()).thenReturn(ownerId);
        when(packageRepository.findById(targetId)).thenReturn(Optional.of(targetPkg));

        var request = mock(PackageControllerV3.MoveQuestionsRequest.class);
        when(request.getQuestionIds()).thenReturn(List.of(UUID.randomUUID().toString()));
        when(request.getTargetPackageId()).thenReturn(targetId.toString());

        assertThatThrownBy(() -> controller.moveQuestions(request, otherTeacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("không sở hữu gói câu hỏi này");
    }

    @Test
    @DisplayName("updatePackage: Cho phép chủ sở hữu cập nhật gói của mình")
    void updatePackage_allowsOwner() {
        UserJpaEntity owner = mock(UserJpaEntity.class);
        when(owner.getId()).thenReturn(ownerId);
        when(owner.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        PackageJpaEntity pkg = mock(PackageJpaEntity.class);
        when(pkg.getOwnerId()).thenReturn(ownerId);
        when(pkg.getId()).thenReturn(packageId);
        when(pkg.getVisibility()).thenReturn(PackageJpaEntity.Visibility.PRIVATE);
        when(packageRepository.findById(packageId)).thenReturn(Optional.of(pkg));
        when(packageRepository.save(any())).thenReturn(pkg);
        when(questionRepository.countByPackageId(packageId)).thenReturn(0L);

        var request = mock(PackageControllerV3.UpdatePackageRequest.class);

        assertThatCode(() -> controller.updatePackage(packageId, request, owner))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("deletePackage: ADMIN bỏ qua kiểm tra sở hữu")
    void deletePackage_allowsAdmin() {
        UserJpaEntity admin = mock(UserJpaEntity.class);
        when(admin.getRole()).thenReturn(UserJpaEntity.UserRole.ADMIN);

        // Admin should not trigger AccessDeniedException — ownership check is skipped
        assertThatCode(() -> controller.deletePackage(packageId, admin))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("moveQuestions: Kiểm tra sở hữu cả gói nguồn và gói đích cho non-admin")
    void moveQuestions_verifiesBothPackages() {
        UUID teacherId = UUID.randomUUID();
        UserJpaEntity teacher = mock(UserJpaEntity.class);
        when(teacher.getId()).thenReturn(teacherId);
        when(teacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);

        // Target package owned by teacher
        UUID targetId = UUID.randomUUID();
        PackageJpaEntity targetPkg = mock(PackageJpaEntity.class);
        when(targetPkg.getOwnerId()).thenReturn(teacherId);

        // Source package owned by someone else
        UUID sourceId = UUID.randomUUID();
        PackageJpaEntity sourcePkg = mock(PackageJpaEntity.class);
        when(sourcePkg.getOwnerId()).thenReturn(UUID.randomUUID()); // different owner

        when(packageRepository.findById(targetId)).thenReturn(Optional.of(targetPkg));
        when(packageRepository.findById(sourceId)).thenReturn(Optional.of(sourcePkg));

        // Question belongs to source package
        QuestionJpaEntity question = mock(QuestionJpaEntity.class);
        when(question.getPackageId()).thenReturn(sourceId);

        UUID questionId = UUID.randomUUID();
        when(questionRepository.findAllById(List.of(questionId))).thenReturn(List.of(question));

        var request = mock(PackageControllerV3.MoveQuestionsRequest.class);
        when(request.getQuestionIds()).thenReturn(List.of(questionId.toString()));
        when(request.getTargetPackageId()).thenReturn(targetId.toString());

        // Should fail on source package ownership check
        assertThatThrownBy(() -> controller.moveQuestions(request, teacher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("không sở hữu gói câu hỏi này");
    }
}
