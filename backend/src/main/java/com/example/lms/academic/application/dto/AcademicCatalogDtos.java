package com.example.lms.academic.application.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AcademicCatalogDtos {
    private AcademicCatalogDtos() {}

    public record CatalogResponse(
            List<DepartmentResponse> departments,
            List<ProgramResponse> programs,
            List<CohortResponse> cohorts,
            List<ClassGroupResponse> classGroups,
            List<SubjectResponse> subjects,
            List<SubjectCourseResponse> subjectCourses
    ) {}

    public record CreateDepartmentCommand(
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 255) String name
    ) {}

    public record CreateProgramCommand(
            UUID departmentId,
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 255) String name,
            @Size(max = 32) String level
    ) {}

    public record CreateCohortCommand(
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 255) String name,
            @NotNull @Min(1900) Integer startYear,
            Integer graduationYear
    ) {}

    public record CreateClassGroupCommand(
            @NotNull UUID programId,
            @NotNull UUID cohortId,
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 255) String name
    ) {}

    public record CreateSubjectCommand(
            UUID departmentId,
            @NotBlank @Size(max = 64) String code,
            @NotBlank @Size(max = 255) String name,
            @Min(0) Integer credits
    ) {}

    public record LinkSubjectCourseCommand(
            @NotNull UUID subjectId,
            @NotNull UUID courseId,
            boolean primary
    ) {}

    public record DepartmentResponse(UUID id, UUID organizationId, String code, String name, String status, Instant createdAt) {}
    public record ProgramResponse(UUID id, UUID organizationId, UUID departmentId, String code, String name, String level, String status, Instant createdAt) {}
    public record CohortResponse(UUID id, UUID organizationId, String code, String name, Integer startYear, Integer graduationYear, String status, Instant createdAt) {}
    public record ClassGroupResponse(UUID id, UUID organizationId, UUID programId, UUID cohortId, String code, String name, String status, Instant createdAt) {}
    public record SubjectResponse(UUID id, UUID organizationId, UUID departmentId, String code, String name, Integer credits, String status, Instant createdAt) {}
    public record SubjectCourseResponse(UUID id, UUID organizationId, UUID subjectId, UUID courseId, boolean primary, String status, Instant createdAt) {}
}
