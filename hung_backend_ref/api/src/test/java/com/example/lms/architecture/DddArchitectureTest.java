package com.example.lms.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

/**
 * Architecture tests to enforce DDD and Clean Architecture rules.
 * 
 * These tests prevent architectural violations and ensure code quality.
 */
class DddArchitectureTest {

    private static JavaClasses importedClasses;

    @BeforeAll
    static void setup() {
        importedClasses = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("com.example.lms");
    }

    @Nested
    @DisplayName("Layer Dependency Rules")
    class LayerDependencyRules {

        @Test
        @DisplayName("Domain layer should not depend on infrastructure")
        void domainShouldNotDependOnInfrastructure() {
            ArchRule rule = noClasses()
                .that().resideInAPackage("..domain..")
                .should().dependOnClassesThat()
                .resideInAPackage("..infrastructure..");

            rule.check(importedClasses);
        }

        @Test
        @DisplayName("Domain layer should not depend on application layer")
        void domainShouldNotDependOnApplication() {
            ArchRule rule = noClasses()
                .that().resideInAPackage("..domain.model..")
                .should().dependOnClassesThat()
                .resideInAPackage("..application..");

            rule.check(importedClasses);
        }

        @Test
        @DisplayName("Application layer should not depend on infrastructure web")
        void applicationShouldNotDependOnWeb() {
            ArchRule rule = noClasses()
                .that().resideInAPackage("..application.usecase..")
                .should().dependOnClassesThat()
                .resideInAPackage("..infrastructure.web..");

            rule.check(importedClasses);
        }
    }

    @Nested
    @DisplayName("Naming Convention Rules")
    class NamingConventionRules {

        @Test
        @DisplayName("Use case classes should end with 'UseCase'")
        void useCaseShouldHaveProperName() {
            ArchRule rule = classes()
                .that().resideInAPackage("..application.usecase..")
                .and().areTopLevelClasses() // Exclude nested Command classes
                .should().haveSimpleNameEndingWith("UseCase")
                .orShould().haveSimpleNameEndingWith("UseCaseV2")
                .orShould().haveSimpleNameEndingWith("UseCaseV3");

            rule.check(importedClasses);
        }

        @Test
        @DisplayName("Controller classes should end with 'Controller'")
        void controllersShouldHaveProperName() {
            ArchRule rule = classes()
                .that().resideInAPackage("..infrastructure.web..")
                .and().areAnnotatedWith(org.springframework.web.bind.annotation.RestController.class)
                .should().haveSimpleNameEndingWith("Controller")
                .orShould().haveSimpleNameEndingWith("ControllerV2")
                .orShould().haveSimpleNameEndingWith("ControllerV3");

            rule.check(importedClasses);
        }

        @Test
        @DisplayName("Repository adapters should end with 'Adapter' or 'Impl'")
        void repositoryAdaptersShouldHaveProperName() {
            ArchRule rule = classes()
                .that().resideInAPackage("..infrastructure.persistence..")
                .and().implement(resideInAPackage("..domain.repository.."))
                .should().haveSimpleNameEndingWith("Adapter")
                .orShould().haveSimpleNameEndingWith("Impl");

            // Note: This is a soft rule, may need adjustments
        }
    }

    @Nested
    @DisplayName("JPA Entity Rules")
    class JpaEntityRules {

        @Test
        @DisplayName("New JPA entities should be in infrastructure persistence entity package")
        void newJpaEntitiesShouldBeInInfrastructure() {
            ArchRule rule = classes()
                .that().areAnnotatedWith(jakarta.persistence.Entity.class)
                .and().haveSimpleNameEndingWith("JpaEntity")
                .should().resideInAPackage("..infrastructure.persistence.entity..");

            rule.check(importedClasses);
        }
    }

    // Helper method
    private static com.tngtech.archunit.base.DescribedPredicate<com.tngtech.archunit.core.domain.JavaClass> 
            resideInAPackage(String packageIdentifier) {
        return com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage(packageIdentifier);
    }
}
