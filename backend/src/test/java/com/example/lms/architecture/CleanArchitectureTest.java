package com.example.lms.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

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
            // Anonymous inner classes ($1, $2) are compiler-generated switch maps — excluded.
            noClasses()
                    .that().resideInAPackage("..application.usecase..")
                    .and().haveSimpleNameNotStartingWith("Get")
                    .and().areNotAnonymousClasses()
                    .should().dependOnClassesThat()
                    .resideInAPackage("..infrastructure..")
                    .because("Command use cases must only depend on domain ports (CQRS read-side Get* excluded)")
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
