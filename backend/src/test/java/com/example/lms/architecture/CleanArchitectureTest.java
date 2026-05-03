package com.example.lms.architecture;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * ArchUnit tests enforcing Clean Architecture layer dependencies.
 *
 * Layer Rule: Domain <- Application <- Infrastructure
 * Domain must NEVER import from infrastructure or application.
 * Application must NEVER import from infrastructure.
 */
@DisplayName("Clean Architecture Rules")
class CleanArchitectureTest {

    /**
     * Transitional allowlist for legacy command handlers that still touch infrastructure directly.
     * Keep this list explicit so the rule continues to block new violations while these use cases
     * are incrementally refactored behind application/domain ports.
     */
    private static final Set<String> APPROVED_LEGACY_COMMAND_USE_CASES_WITH_INFRA_DEBT = Set.of(
            "com.example.lms.assessment.application.usecase.GradeSubmissionUseCase",
            "com.example.lms.assessment.application.usecase.ManageAssignmentInstructionAttachmentsUseCase",
            "com.example.lms.course_authoring.application.usecase.ApproveCourseUseCase",
            "com.example.lms.course_authoring.application.usecase.BulkAdoptPublicationUseCase",
            "com.example.lms.course_authoring.application.usecase.CourseAuthoringUseCase",
            "com.example.lms.course_authoring.application.usecase.ManageContentBlockUseCaseV3",
            "com.example.lms.course_authoring.application.usecase.RejectCourseUseCase",
            "com.example.lms.learning_delivery.application.usecase.CreateLearningClassUseCaseV3",
            "com.example.lms.learning_delivery.application.usecase.ManageClassTeachersUseCase",
            "com.example.lms.learning_delivery.application.usecase.UpdateLearningClassUseCase"
    );

    private static final DescribedPredicate<JavaClass> COMMAND_USE_CASES_OUTSIDE_APPROVED_LEGACY_DEBT =
            new DescribedPredicate<>("command use cases outside approved legacy infrastructure debt") {
                @Override
                public boolean test(JavaClass javaClass) {
                    return javaClass.getPackageName().contains(".application.usecase")
                            && !javaClass.getSimpleName().startsWith("Get")
                            && !javaClass.isAnonymousClass()
                            && !APPROVED_LEGACY_COMMAND_USE_CASES_WITH_INFRA_DEBT.contains(javaClass.getFullName());
                }
            };

    private static JavaClasses importedClasses;

    @BeforeAll
    static void importClasses() {
        importedClasses = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.example.lms");
    }

    @Nested
    @DisplayName("Domain Layer Rules")
    class DomainLayerRules {

        @Test
        @DisplayName("Domain models should not depend on infrastructure")
        void domainShouldNotDependOnInfrastructure() {
            noClasses()
                    .that().resideInAPackage("..domain.model..")
                    .should().dependOnClassesThat()
                    .resideInAPackage("..infrastructure..")
                    .because("Domain models must be pure Java with no infrastructure dependencies")
                    .check(importedClasses);
        }

        @Test
        @DisplayName("Domain repositories (ports) should not depend on infrastructure")
        void domainRepositoriesShouldNotDependOnInfrastructure() {
            noClasses()
                    .that().resideInAPackage("..domain.repository..")
                    .should().dependOnClassesThat()
                    .resideInAPackage("..infrastructure..")
                    .because("Domain repository ports must not import JPA entities or Spring Data")
                    .check(importedClasses);
        }

        @Test
        @DisplayName("Domain should not depend on Spring Framework")
        void domainShouldNotDependOnSpring() {
            noClasses()
                    .that().resideInAPackage("..domain.model..")
                    .should().dependOnClassesThat()
                    .resideInAPackage("org.springframework..")
                    .because("Domain models must be framework-agnostic")
                    .check(importedClasses);
        }

        @Test
        @DisplayName("Domain should not depend on JPA/Hibernate")
        void domainShouldNotDependOnJpa() {
            noClasses()
                    .that().resideInAPackage("..domain.model..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage("jakarta.persistence..", "org.hibernate..")
                    .because("Domain models must not use JPA annotations")
                    .check(importedClasses);
        }
    }

    @Nested
    @DisplayName("Application Layer Rules")
    class ApplicationLayerRules {

        @Test
        @DisplayName("Use cases should not depend on infrastructure")
        void useCasesShouldNotDependOnInfrastructure() {
            // CQRS read-side query handlers (Get*) may access JPA directly for performance.
            // Legacy command handlers with known debt are tracked through an explicit allowlist.
            noClasses()
                    .that(COMMAND_USE_CASES_OUTSIDE_APPROVED_LEGACY_DEBT)
                    .should().dependOnClassesThat()
                    .resideInAPackage("..infrastructure..")
                    .because("Command use cases must only depend on domain ports; known transitional debt must stay explicit and bounded")
                    .check(importedClasses);
        }

        @Test
        @DisplayName("Application DTOs should not depend on infrastructure")
        void dtosShouldNotDependOnInfrastructure() {
            noClasses()
                    .that().resideInAPackage("..application.dto..")
                    .should().dependOnClassesThat()
                    .resideInAPackage("..infrastructure..")
                    .because("DTOs must not reference JPA entities or infrastructure classes")
                    .check(importedClasses);
        }
    }

    @Nested
    @DisplayName("Infrastructure Layer Rules")
    class InfrastructureLayerRules {

        @Test
        @DisplayName("JPA entities should be in persistence/entity package")
        void jpaEntitiesShouldBeInCorrectPackage() {
            classes()
                    .that().areAnnotatedWith(jakarta.persistence.Entity.class)
                    .should().resideInAPackage("..infrastructure.persistence.entity..")
                    .orShould().resideInAPackage("..infrastructure.persistence..")
                    .orShould().resideInAPackage("..infrastructure.outbox..")
                    .because("JPA entities must live in the infrastructure persistence layer (or outbox)")
                    .check(importedClasses);
        }
    }
}
