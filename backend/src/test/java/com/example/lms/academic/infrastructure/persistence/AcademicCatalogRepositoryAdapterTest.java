package com.example.lms.academic.infrastructure.persistence;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicLearningPackageEnrollmentJpaEntity;
import com.example.lms.academic.infrastructure.persistence.repository.AcademicLearningPackageEnrollmentJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AcademicCatalogRepositoryAdapter Tests")
class AcademicCatalogRepositoryAdapterTest {
    @Mock
    private AcademicLearningPackageEnrollmentJpaRepository learningPackageEnrollments;

    private AcademicCatalogRepositoryAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new AcademicCatalogRepositoryAdapter(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                learningPackageEnrollments,
                null,
                null);
    }

    @Test
    @DisplayName("findLearningPackageEnrollment: only returns current enrollment statuses")
    void findLearningPackageEnrollment_onlyReturnsCurrentStatuses() {
        UUID organizationId = UUID.randomUUID();
        UUID packageId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        var entity = enrollmentEntity(organizationId, packageId, studentId, "PENDING_PAYMENT");

        when(learningPackageEnrollments.findFirstByOrganizationIdAndPackageIdAndStudentIdAndStatusInOrderByRequestedAtDesc(
                organizationId,
                packageId,
                studentId,
                List.of("PENDING_APPROVAL", "PENDING_PAYMENT", "ACTIVE")))
                .thenReturn(Optional.of(entity));

        var result = adapter.findLearningPackageEnrollment(organizationId, packageId, studentId);

        assertThat(result).isPresent();
        assertThat(result.get().status()).isEqualTo("PENDING_PAYMENT");
        verify(learningPackageEnrollments).findFirstByOrganizationIdAndPackageIdAndStudentIdAndStatusInOrderByRequestedAtDesc(
                organizationId,
                packageId,
                studentId,
                List.of("PENDING_APPROVAL", "PENDING_PAYMENT", "ACTIVE"));
    }

    private AcademicLearningPackageEnrollmentJpaEntity enrollmentEntity(
            UUID organizationId,
            UUID packageId,
            UUID studentId,
            String status) {
        return AcademicLearningPackageEnrollmentJpaEntity.builder()
                .id(UUID.randomUUID())
                .organizationId(organizationId)
                .packageId(packageId)
                .studentId(studentId)
                .status(status)
                .paymentAmount(new BigDecimal("1200000"))
                .paymentCurrency("VND")
                .requestedAt(Instant.now())
                .createdAt(Instant.now())
                .build();
    }
}
