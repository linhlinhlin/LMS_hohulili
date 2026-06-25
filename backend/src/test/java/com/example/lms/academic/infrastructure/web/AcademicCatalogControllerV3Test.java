package com.example.lms.academic.infrastructure.web;

import com.example.lms.academic.application.dto.AcademicCatalogDtos.CreateDepartmentCommand;
import com.example.lms.academic.application.usecase.ManageAcademicCatalogUseCase;
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
@DisplayName("AcademicCatalogControllerV3 Tests")
class AcademicCatalogControllerV3Test {
    @Mock
    private ManageAcademicCatalogUseCase useCase;

    @InjectMocks
    private AcademicCatalogControllerV3 controller;

    @Test
    @DisplayName("getCatalog: rejects ORG_ADMIN from another organization")
    void getCatalog_rejectsOrgAdminFromAnotherOrganization() {
        UUID organizationId = UUID.randomUUID();
        UUID otherOrganizationId = UUID.randomUUID();
        UserJpaEntity orgAdmin = user(UserJpaEntity.UserRole.ORG_ADMIN, otherOrganizationId);

        assertThatThrownBy(() -> controller.getCatalog(organizationId, orgAdmin))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("No access");
        verify(useCase, never()).getCatalog(organizationId);
    }

    @Test
    @DisplayName("createDepartment: allows system ADMIN for any organization")
    void createDepartment_allowsSystemAdminForAnyOrganization() {
        UUID organizationId = UUID.randomUUID();
        UserJpaEntity admin = user(UserJpaEntity.UserRole.ADMIN, null);
        var command = new CreateDepartmentCommand("VMU", "Vietnam Maritime University");

        controller.createDepartment(organizationId, command, admin);

        verify(useCase).createDepartment(organizationId, command);
    }

    private UserJpaEntity user(UserJpaEntity.UserRole role, UUID organizationId) {
        UserJpaEntity user = mock(UserJpaEntity.class);
        when(user.getRole()).thenReturn(role);
        if (organizationId != null) {
            when(user.getOrganizationId()).thenReturn(organizationId);
        }
        return user;
    }
}
