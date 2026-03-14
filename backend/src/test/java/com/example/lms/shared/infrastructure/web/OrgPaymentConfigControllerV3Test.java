package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.application.usecase.ManageOrgPaymentConfigUseCase;
import com.example.lms.shared.domain.model.OrgPaymentConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrgPaymentConfigControllerV3Test {

    @Mock
    private ManageOrgPaymentConfigUseCase useCase;

    @InjectMocks
    private OrgPaymentConfigControllerV3 controller;

    @Test
    @DisplayName("ORG_ADMIN can read payment config for their own organization")
    void orgAdminCanReadOwnOrganizationConfig() {
        UUID orgId = UUID.randomUUID();
        UserJpaEntity orgAdmin = user(UUID.randomUUID(), UserJpaEntity.UserRole.ORG_ADMIN, orgId);
        OrgPaymentConfig config = OrgPaymentConfig.create(
                orgId,
                BigDecimal.valueOf(10),
                BigDecimal.valueOf(80),
                BigDecimal.valueOf(100000)
        );
        when(useCase.getConfig(orgId)).thenReturn(config);

        var response = controller.getConfig(orgId, orgAdmin);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        verify(useCase).getConfig(orgId);
    }

    @Test
    @DisplayName("ORG_ADMIN cannot read payment config for another organization")
    void orgAdminCannotReadOtherOrganizationConfig() {
        UUID orgId = UUID.randomUUID();
        UserJpaEntity orgAdmin = user(UUID.randomUUID(), UserJpaEntity.UserRole.ORG_ADMIN, UUID.randomUUID());

        assertThatThrownBy(() -> controller.getConfig(orgId, orgAdmin))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("tổ chức khác");
        verify(useCase, never()).getConfig(orgId);
    }

    @Test
    @DisplayName("ADMIN can update payment config for any organization")
    void adminCanUpdateAnyOrganizationConfig() {
        UUID orgId = UUID.randomUUID();
        UserJpaEntity admin = user(UUID.randomUUID(), UserJpaEntity.UserRole.ADMIN, UUID.randomUUID());
        OrgPaymentConfig config = OrgPaymentConfig.create(
                orgId,
                BigDecimal.valueOf(10),
                BigDecimal.valueOf(80),
                BigDecimal.valueOf(120000)
        );
        when(useCase.upsertConfig(orgId, BigDecimal.valueOf(10.0), BigDecimal.valueOf(80.0), BigDecimal.valueOf(120000.0)))
                .thenReturn(config);

        var response = controller.upsertConfig(
                orgId,
                new OrgPaymentConfigControllerV3.UpsertConfigBody(10, 80, 120000),
                admin);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        verify(useCase).upsertConfig(orgId, BigDecimal.valueOf(10.0), BigDecimal.valueOf(80.0), BigDecimal.valueOf(120000.0));
    }

    private UserJpaEntity user(UUID id, UserJpaEntity.UserRole role, UUID organizationId) {
        UserJpaEntity user = new UserJpaEntity();
        user.setId(id);
        user.setRole(role);
        user.setOrganizationId(organizationId);
        user.setEmail("user-" + id + "@maritime.edu");
        user.setFullName("Test User");
        return user;
    }
}
