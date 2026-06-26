package com.example.lms.academic.infrastructure.web;

import com.example.lms.academic.application.usecase.ManageLearningPackageEnrollmentUseCase;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LearningPackageEnrollmentControllerV3 Tests")
class LearningPackageEnrollmentControllerV3Test {
    @Mock
    private ManageLearningPackageEnrollmentUseCase useCase;

    @InjectMocks
    private LearningPackageEnrollmentControllerV3 controller;

    @Test
    @DisplayName("requestMyEnrollment: rejects student from another organization")
    void requestMyEnrollment_rejectsStudentFromAnotherOrganization() {
        UUID organizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UserJpaEntity student = user(UserJpaEntity.UserRole.STUDENT, UUID.randomUUID(), true);

        assertThatThrownBy(() -> controller.requestMyEnrollment(organizationId, packageId, student))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("No access");
        verify(useCase, never()).requestEnrollment(organizationId, packageId, student.getId());
    }

    @Test
    @DisplayName("requestMyEnrollment: allows same-organization student")
    void requestMyEnrollment_allowsSameOrganizationStudent() {
        UUID organizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UserJpaEntity student = user(UserJpaEntity.UserRole.STUDENT, organizationId, true);

        controller.requestMyEnrollment(organizationId, packageId, student);

        verify(useCase).requestEnrollment(organizationId, packageId, student.getId());
    }

    @Test
    @DisplayName("listEnrollments: rejects ORG_ADMIN from another organization")
    void listEnrollments_rejectsOrgAdminFromAnotherOrganization() {
        UUID organizationId = UUID.randomUUID();
        UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, UUID.randomUUID(), false);

        assertThatThrownBy(() -> controller.listEnrollments(organizationId, null, orgAdmin))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("No access");
        verify(useCase, never()).listEnrollments(organizationId, null);
    }

    @Test
    @DisplayName("listEnrollments: allows system ADMIN for any organization")
    void listEnrollments_allowsSystemAdminForAnyOrganization() {
        UUID organizationId = UUID.randomUUID();
        UserJpaEntity admin = user(UserJpaEntity.UserRole.ADMIN, null, false);

        controller.listEnrollments(organizationId, "PENDING_APPROVAL", admin);

        verify(useCase).listEnrollments(organizationId, "PENDING_APPROVAL");
    }

    private UserJpaEntity user(UserJpaEntity.UserRole role, UUID organizationId, boolean withId) {
        UserJpaEntity user = mock(UserJpaEntity.class);
        when(user.getRole()).thenReturn(role);
        if (withId) {
            when(user.getId()).thenReturn(UUID.randomUUID());
        }
        if (organizationId != null) {
            when(user.getOrganizationId()).thenReturn(organizationId);
        }
        return user;
    }
}
