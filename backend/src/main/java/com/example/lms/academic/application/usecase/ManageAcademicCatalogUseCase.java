package com.example.lms.academic.application.usecase;

import com.example.lms.academic.application.dto.AcademicCatalogDtos.*;
import com.example.lms.academic.domain.model.*;
import com.example.lms.academic.domain.repository.AcademicCatalogRepository;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ManageAcademicCatalogUseCase {
    private final AcademicCatalogRepository repository;
    private final CourseRepository courseRepository;

    public CatalogResponse getCatalog(UUID organizationId) {
        return new CatalogResponse(
                repository.findDepartments(organizationId).stream().map(this::toResponse).toList(),
                repository.findPrograms(organizationId).stream().map(this::toResponse).toList(),
                repository.findCohorts(organizationId).stream().map(this::toResponse).toList(),
                repository.findClassGroups(organizationId).stream().map(this::toResponse).toList(),
                repository.findSubjects(organizationId).stream().map(this::toResponse).toList(),
                repository.findSubjectCourses(organizationId).stream().map(this::toResponse).toList()
        );
    }

    public DepartmentResponse createDepartment(UUID organizationId, CreateDepartmentCommand command) {
        var department = AcademicDepartment.create(organizationId, command.code(), command.name());
        if (repository.departmentCodeExists(organizationId, department.code())) {
            throw new ValidationException("code", "Department code already exists");
        }
        return toResponse(repository.saveDepartment(department));
    }

    public ProgramResponse createProgram(UUID organizationId, CreateProgramCommand command) {
        if (command.departmentId() != null) {
            requireDepartment(organizationId, command.departmentId());
        }
        var program = AcademicProgram.create(
                organizationId,
                command.departmentId(),
                command.code(),
                command.name(),
                command.level());
        if (repository.programCodeExists(organizationId, program.code())) {
            throw new ValidationException("code", "Program code already exists");
        }
        return toResponse(repository.saveProgram(program));
    }

    public CohortResponse createCohort(UUID organizationId, CreateCohortCommand command) {
        var cohort = AcademicCohort.create(
                organizationId,
                command.code(),
                command.name(),
                command.startYear(),
                command.graduationYear());
        if (repository.cohortCodeExists(organizationId, cohort.code())) {
            throw new ValidationException("code", "Cohort code already exists");
        }
        return toResponse(repository.saveCohort(cohort));
    }

    public ClassGroupResponse createClassGroup(UUID organizationId, CreateClassGroupCommand command) {
        requireProgram(organizationId, command.programId());
        requireCohort(organizationId, command.cohortId());
        var classGroup = AcademicClassGroup.create(
                organizationId,
                command.programId(),
                command.cohortId(),
                command.code(),
                command.name());
        if (repository.classGroupCodeExists(organizationId, classGroup.code())) {
            throw new ValidationException("code", "Class group code already exists");
        }
        return toResponse(repository.saveClassGroup(classGroup));
    }

    public SubjectResponse createSubject(UUID organizationId, CreateSubjectCommand command) {
        if (command.departmentId() != null) {
            requireDepartment(organizationId, command.departmentId());
        }
        var subject = AcademicSubject.create(
                organizationId,
                command.departmentId(),
                command.code(),
                command.name(),
                command.credits());
        if (repository.subjectCodeExists(organizationId, subject.code())) {
            throw new ValidationException("code", "Subject code already exists");
        }
        return toResponse(repository.saveSubject(subject));
    }

    public SubjectCourseResponse linkSubjectCourse(UUID organizationId, LinkSubjectCourseCommand command) {
        requireSubject(organizationId, command.subjectId());
        var course = courseRepository.findById(command.courseId())
                .orElseThrow(() -> new EntityNotFoundException("Course", command.courseId()));
        if (!Objects.equals(course.getOrganizationId(), organizationId)) {
            throw new BusinessRuleException("COURSE_ORG_MISMATCH", "Course does not belong to this organization");
        }
        if (repository.subjectCourseExists(organizationId, command.subjectId(), command.courseId())) {
            throw new ValidationException("courseId", "Course is already linked to this subject");
        }
        var link = AcademicSubjectCourse.create(
                organizationId,
                command.subjectId(),
                command.courseId(),
                command.primary());
        return toResponse(repository.saveSubjectCourse(link));
    }

    private void requireDepartment(UUID organizationId, UUID id) {
        repository.findDepartment(organizationId, id)
                .orElseThrow(() -> new EntityNotFoundException("AcademicDepartment", id));
    }

    private void requireProgram(UUID organizationId, UUID id) {
        repository.findProgram(organizationId, id)
                .orElseThrow(() -> new EntityNotFoundException("AcademicProgram", id));
    }

    private void requireCohort(UUID organizationId, UUID id) {
        repository.findCohort(organizationId, id)
                .orElseThrow(() -> new EntityNotFoundException("AcademicCohort", id));
    }

    private void requireSubject(UUID organizationId, UUID id) {
        repository.findSubject(organizationId, id)
                .orElseThrow(() -> new EntityNotFoundException("AcademicSubject", id));
    }

    private DepartmentResponse toResponse(AcademicDepartment d) {
        return new DepartmentResponse(d.id(), d.organizationId(), d.code(), d.name(), d.status(), d.createdAt());
    }

    private ProgramResponse toResponse(AcademicProgram p) {
        return new ProgramResponse(p.id(), p.organizationId(), p.departmentId(), p.code(), p.name(), p.level(), p.status(), p.createdAt());
    }

    private CohortResponse toResponse(AcademicCohort c) {
        return new CohortResponse(c.id(), c.organizationId(), c.code(), c.name(), c.startYear(), c.graduationYear(), c.status(), c.createdAt());
    }

    private ClassGroupResponse toResponse(AcademicClassGroup c) {
        return new ClassGroupResponse(c.id(), c.organizationId(), c.programId(), c.cohortId(), c.code(), c.name(), c.status(), c.createdAt());
    }

    private SubjectResponse toResponse(AcademicSubject s) {
        return new SubjectResponse(s.id(), s.organizationId(), s.departmentId(), s.code(), s.name(), s.credits(), s.status(), s.createdAt());
    }

    private SubjectCourseResponse toResponse(AcademicSubjectCourse sc) {
        return new SubjectCourseResponse(sc.id(), sc.organizationId(), sc.subjectId(), sc.courseId(), sc.primary(), sc.status(), sc.createdAt());
    }
}
