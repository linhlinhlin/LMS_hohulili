package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.domain.model.Certificate;
import com.example.lms.learning_delivery.domain.repository.CertificateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CertificateUseCase Tests")
class CertificateUseCaseTest {

    @Mock
    private CertificateRepository certificateRepository;

    @InjectMocks
    private CertificateUseCase useCase;

    private UUID enrollmentId;
    private UUID studentId;
    private UUID courseId;

    @BeforeEach
    void setUp() {
        enrollmentId = UUID.randomUUID();
        studentId = UUID.randomUUID();
        courseId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Should issue certificate when none exists")
    void shouldIssueCertificate() {
        when(certificateRepository.findByEnrollmentId(enrollmentId)).thenReturn(Optional.empty());
        when(certificateRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Certificate result = useCase.issueIfNotExists(enrollmentId, studentId, courseId);

        assertThat(result).isNotNull();
        assertThat(result.getEnrollmentId()).isEqualTo(enrollmentId);
        assertThat(result.getStudentId()).isEqualTo(studentId);
        assertThat(result.getCourseId()).isEqualTo(courseId);
        assertThat(result.getVerificationToken()).isNotNull();
        assertThat(result.getIssuedAt()).isNotNull();
        verify(certificateRepository).save(any());
    }

    @Test
    @DisplayName("Should return existing certificate (idempotent)")
    void shouldReturnExistingCertificate() {
        Certificate existing = Certificate.issue(enrollmentId, studentId, courseId);
        when(certificateRepository.findByEnrollmentId(enrollmentId)).thenReturn(Optional.of(existing));

        Certificate result = useCase.issueIfNotExists(enrollmentId, studentId, courseId);

        assertThat(result.getId()).isEqualTo(existing.getId());
        verify(certificateRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should verify certificate by token")
    void shouldVerifyByToken() {
        Certificate cert = Certificate.issue(enrollmentId, studentId, courseId);
        UUID token = cert.getVerificationToken();

        when(certificateRepository.findByVerificationToken(token)).thenReturn(Optional.of(cert));

        Optional<Certificate> result = useCase.verifyByToken(token);

        assertThat(result).isPresent();
        assertThat(result.get().getStudentId()).isEqualTo(studentId);
    }
}
