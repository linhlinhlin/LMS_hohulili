package com.example.lms.competency_mapping.infrastructure.web;

import com.example.lms.competency_mapping.application.dto.UpdateLessonCompetenciesCommand;
import com.example.lms.competency_mapping.application.usecase.*;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3")
@Tag(name = "Competency Mapping", description = "STCW/SOLAS/COLREGs/MARPOL competency mapping for lessons")
public class CompetencyMappingController {

    private final GetStandardsUseCase getStandards;
    private final GetCompetenciesUseCase getCompetencies;
    private final GetCourseCompetencyMapUseCase getCourseMap;
    private final UpdateLessonCompetenciesUseCase updateLessonCompetencies;
    private final GetLessonCompetenciesUseCase getLessonCompetencies;
    private final ExportCompetencyMapUseCase exportMap;

    public CompetencyMappingController(GetStandardsUseCase getStandards,
                                        GetCompetenciesUseCase getCompetencies,
                                        GetCourseCompetencyMapUseCase getCourseMap,
                                        UpdateLessonCompetenciesUseCase updateLessonCompetencies,
                                        GetLessonCompetenciesUseCase getLessonCompetencies,
                                        ExportCompetencyMapUseCase exportMap) {
        this.getStandards = getStandards;
        this.getCompetencies = getCompetencies;
        this.getCourseMap = getCourseMap;
        this.updateLessonCompetencies = updateLessonCompetencies;
        this.getLessonCompetencies = getLessonCompetencies;
        this.exportMap = exportMap;
    }

    @GetMapping("/standards")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "List maritime standards")
    public ResponseEntity<?> getStandards(
            @RequestParam(defaultValue = "true") boolean active) {
        return ResponseEntity.ok(ApiResponse.success(getStandards.execute(active)));
    }

    @GetMapping("/standards/{standardId}/competencies")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "List competencies for a standard")
    public ResponseEntity<?> getCompetencies(
            @PathVariable UUID standardId,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(ApiResponse.success(getCompetencies.execute(standardId, category)));
    }

    @GetMapping("/courses/{courseId}/competency-map")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get full competency matrix for a course (cached 60s)")
    public ResponseEntity<?> getCourseCompetencyMap(@PathVariable UUID courseId) {
        return ResponseEntity.ok(ApiResponse.success(getCourseMap.execute(courseId)));
    }

    @PutMapping("/lessons/{lessonId}/competencies")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Update competency mappings for a lesson (diff-based upsert)")
    public ResponseEntity<?> updateLessonCompetencies(
            @PathVariable UUID lessonId,
            @Valid @RequestBody UpdateLessonCompetenciesCommand command,
            @AuthenticationPrincipal UserJpaEntity currentUser) {

        boolean isAdmin = currentUser.getRole() == UserJpaEntity.UserRole.ADMIN
                || currentUser.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;

        var result = updateLessonCompetencies.execute(
                lessonId, currentUser.getId(), isAdmin, command);

        var body = new LinkedHashMap<String, Object>();
        body.put("message", "Updated");
        body.put("lessonId", result.lessonId());
        body.put("mappingCount", result.mappingCount());
        if (result.warning() != null) body.put("warning", result.warning());

        return ResponseEntity.ok(ApiResponse.success(body));
    }

    @GetMapping("/lessons/{lessonId}/competencies")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get current competency mappings for a lesson")
    public ResponseEntity<?> getLessonCompetencies(@PathVariable UUID lessonId) {
        return ResponseEntity.ok(ApiResponse.success(getLessonCompetencies.execute(lessonId)));
    }

    @GetMapping("/courses/{courseId}/competency-map/export")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Export competency map as CSV file")
    public ResponseEntity<byte[]> exportCsv(@PathVariable UUID courseId) {
        var csv = exportMap.execute(courseId);
        var filename = "competency-map-" + courseId + "-" + LocalDate.now() + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }
}
