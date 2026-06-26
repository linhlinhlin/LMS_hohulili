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
                repository.findSubjectCourses(organizationId).stream().map(this::toResponse).toList(),
                repository.findTerms(organizationId).stream().map(this::toResponse).toList(),
                repository.findCurriculumPlans(organizationId).stream().map(this::toResponse).toList(),
                repository.findCurriculumSubjects(organizationId).stream().map(this::toResponse).toList(),
                repository.findLearningPackages(organizationId).stream().map(this::toResponse).toList(),
                repository.findLearningPackageItems(organizationId).stream().map(this::toResponse).toList()
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

    public TermResponse createTerm(UUID organizationId, CreateTermCommand command) {
        var term = AcademicTerm.create(
                organizationId,
                command.code(),
                command.name(),
                command.academicYear(),
                command.termNumber(),
                command.startsOn(),
                command.endsOn());
        if (repository.termCodeExists(organizationId, term.code())) {
            throw new ValidationException("code", "Term code already exists");
        }
        return toResponse(repository.saveTerm(term));
    }

    public CurriculumPlanResponse createCurriculumPlan(UUID organizationId, CreateCurriculumPlanCommand command) {
        requireProgram(organizationId, command.programId());
        if (command.cohortId() != null) {
            requireCohort(organizationId, command.cohortId());
        }
        var plan = AcademicCurriculumPlan.create(
                organizationId,
                command.programId(),
                command.cohortId(),
                command.code(),
                command.name(),
                command.totalCredits());
        if (repository.curriculumPlanCodeExists(organizationId, plan.code())) {
            throw new ValidationException("code", "Curriculum plan code already exists");
        }
        return toResponse(repository.saveCurriculumPlan(plan));
    }

    public CurriculumSubjectResponse addCurriculumSubject(UUID organizationId, AddCurriculumSubjectCommand command) {
        requireCurriculumPlan(organizationId, command.curriculumPlanId());
        requireSubject(organizationId, command.subjectId());
        if (command.termId() != null) {
            requireTerm(organizationId, command.termId());
        }
        if (repository.curriculumSubjectExists(organizationId, command.curriculumPlanId(), command.subjectId())) {
            throw new ValidationException("subjectId", "Subject is already in this curriculum plan");
        }
        var subject = AcademicCurriculumSubject.create(
                organizationId,
                command.curriculumPlanId(),
                command.subjectId(),
                command.termId(),
                command.displayOrder(),
                command.required(),
                command.creditsOverride());
        return toResponse(repository.saveCurriculumSubject(subject));
    }

    public LearningPackageResponse createLearningPackage(UUID organizationId, CreateLearningPackageCommand command) {
        if (command.curriculumPlanId() != null) {
            requireCurriculumPlan(organizationId, command.curriculumPlanId());
        }
        var learningPackage = AcademicLearningPackage.create(
                organizationId,
                command.curriculumPlanId(),
                command.code(),
                command.name(),
                command.description(),
                command.packageType(),
                command.price(),
                command.currency(),
                command.enrollmentPolicy());
        if (repository.learningPackageCodeExists(organizationId, learningPackage.code())) {
            throw new ValidationException("code", "Learning package code already exists");
        }
        return toResponse(repository.saveLearningPackage(learningPackage));
    }

    public LearningPackageItemResponse addLearningPackageItem(UUID organizationId, AddLearningPackageItemCommand command) {
        requireLearningPackage(organizationId, command.packageId());
        if (command.subjectId() != null) {
            requireSubject(organizationId, command.subjectId());
            if (repository.learningPackageSubjectExists(organizationId, command.packageId(), command.subjectId())) {
                throw new ValidationException("subjectId", "Subject is already in this learning package");
            }
        }
        if (command.courseId() != null) {
            var course = courseRepository.findById(command.courseId())
                    .orElseThrow(() -> new EntityNotFoundException("Course", command.courseId()));
            if (!Objects.equals(course.getOrganizationId(), organizationId)) {
                throw new BusinessRuleException("COURSE_ORG_MISMATCH", "Course does not belong to this organization");
            }
            if (repository.learningPackageCourseExists(organizationId, command.packageId(), command.courseId())) {
                throw new ValidationException("courseId", "Course is already in this learning package");
            }
        }
        var item = AcademicLearningPackageItem.create(
                organizationId,
                command.packageId(),
                command.subjectId(),
                command.courseId(),
                command.displayOrder(),
                command.required());
        return toResponse(repository.saveLearningPackageItem(item));
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

    private void requireTerm(UUID organizationId, UUID id) {
        repository.findTerm(organizationId, id)
                .orElseThrow(() -> new EntityNotFoundException("AcademicTerm", id));
    }

    private void requireCurriculumPlan(UUID organizationId, UUID id) {
        repository.findCurriculumPlan(organizationId, id)
                .orElseThrow(() -> new EntityNotFoundException("AcademicCurriculumPlan", id));
    }

    private void requireLearningPackage(UUID organizationId, UUID id) {
        repository.findLearningPackage(organizationId, id)
                .orElseThrow(() -> new EntityNotFoundException("AcademicLearningPackage", id));
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

    private TermResponse toResponse(AcademicTerm t) {
        return new TermResponse(
                t.id(),
                t.organizationId(),
                t.code(),
                t.name(),
                t.academicYear(),
                t.termNumber(),
                t.startsOn(),
                t.endsOn(),
                t.status(),
                t.createdAt());
    }

    private CurriculumPlanResponse toResponse(AcademicCurriculumPlan p) {
        return new CurriculumPlanResponse(
                p.id(),
                p.organizationId(),
                p.programId(),
                p.cohortId(),
                p.code(),
                p.name(),
                p.totalCredits(),
                p.status(),
                p.createdAt());
    }

    private CurriculumSubjectResponse toResponse(AcademicCurriculumSubject s) {
        return new CurriculumSubjectResponse(
                s.id(),
                s.organizationId(),
                s.curriculumPlanId(),
                s.subjectId(),
                s.termId(),
                s.displayOrder(),
                s.required(),
                s.creditsOverride(),
                s.status(),
                s.createdAt());
    }

    private LearningPackageResponse toResponse(AcademicLearningPackage p) {
        return new LearningPackageResponse(
                p.id(),
                p.organizationId(),
                p.curriculumPlanId(),
                p.code(),
                p.name(),
                p.description(),
                p.packageType(),
                p.price(),
                p.currency(),
                p.enrollmentPolicy(),
                p.status(),
                p.createdAt());
    }

    private LearningPackageItemResponse toResponse(AcademicLearningPackageItem i) {
        return new LearningPackageItemResponse(
                i.id(),
                i.organizationId(),
                i.packageId(),
                i.subjectId(),
                i.courseId(),
                i.displayOrder(),
                i.required(),
                i.status(),
                i.createdAt());
    }
}
