package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.application.usecase.CertificateUseCase;
import com.example.lms.learning_delivery.domain.model.Certificate;
import com.example.lms.learning_delivery.infrastructure.pdf.CertificatePdfService;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Slf4j
@Tag(name = "Certificates V3", description = "API chứng chỉ hoàn thành khóa học")
@RestController
@RequestMapping("/api/v3/certificates")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class CertificateControllerV3 {

    private final CertificateUseCase certificateUseCase;
    private final CertificatePdfService certificatePdfService;
    private final UserJpaRepository userRepository;
    private final JpaCourseRepository courseRepository;

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lấy danh sách chứng chỉ của học viên")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyCertificates(
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        }

        List<Certificate> certificates = certificateUseCase.findByStudent(currentUser.getId());
        List<Map<String, Object>> result = certificates.stream().map(this::toCertMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Tải chứng chỉ thành công"));
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Tải chứng chỉ PDF")
    public ResponseEntity<byte[]> downloadCertificate(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID id) {
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        List<Certificate> certs = certificateUseCase.findByStudent(currentUser.getId());
        Certificate cert = certs.stream()
                .filter(c -> c.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (cert == null) {
            return ResponseEntity.notFound().build();
        }

        String studentName = userRepository.findById(cert.getStudentId())
                .map(UserJpaEntity::getFullName).orElse("N/A");
        String courseTitle = courseRepository.findById(cert.getCourseId())
                .map(c -> c.getTitle()).orElse("N/A");

        try {
            byte[] pdf = certificatePdfService.generateCertificate(
                    studentName, courseTitle, cert.getIssuedAt(), cert.getVerificationToken());
            log.info("[Certificate] Tải PDF chứng chỉ: student={}, cert={}", currentUser.getId(), id);
            return ResponseEntity.ok()
                    .header("Content-Type", "application/pdf")
                    .header("Content-Disposition", "attachment; filename=\"certificate-" + id + ".pdf\"")
                    .body(pdf);
        } catch (java.io.IOException e) {
            log.error("[Certificate] Lỗi tạo PDF: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/verify/{token}")
    @Operation(summary = "Xác minh chứng chỉ (công khai)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyCertificate(@PathVariable UUID token) {
        return certificateUseCase.verifyByToken(token)
                .map(cert -> {
                    Map<String, Object> result = toCertMap(cert);
                    String studentName = userRepository.findById(cert.getStudentId())
                            .map(UserJpaEntity::getFullName).orElse("N/A");
                    String courseTitle = courseRepository.findById(cert.getCourseId())
                            .map(c -> c.getTitle()).orElse("N/A");
                    result.put("studentName", studentName);
                    result.put("courseTitle", courseTitle);
                    return ResponseEntity.ok(ApiResponse.success(result, "Chứng chỉ hợp lệ"));
                })
                .orElse(ResponseEntity.status(404)
                        .body(ApiResponse.error("Không tìm thấy chứng chỉ với mã xác minh này")));
    }

    private Map<String, Object> toCertMap(Certificate cert) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", cert.getId().toString());
        map.put("enrollmentId", cert.getEnrollmentId().toString());
        map.put("studentId", cert.getStudentId().toString());
        map.put("courseId", cert.getCourseId().toString());
        map.put("verificationToken", cert.getVerificationToken().toString());
        map.put("issuedAt", cert.getIssuedAt() != null ? cert.getIssuedAt().toString() : null);
        return map;
    }
}
