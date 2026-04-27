package com.example.lms.architecture;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.domain.JavaParameterizedType;
import com.tngtech.archunit.core.domain.JavaType;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import org.hibernate.annotations.Type;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.Serializable;
import java.util.Map;
import java.util.Set;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.fields;

/**
 * Architectural test enforcing Serializable contract cho mọi POJO type được lưu
 * trong JSONB fields qua hypersistence-utils {@link JsonType}.
 *
 * <p><strong>Background — bug pattern this prevents:</strong></p>
 *
 * <p>Hibernate calls {@code MutabilityPlan.deepCopy()} để snapshot field state khi
 * MERGE entity (UPDATE existing row). For {@code @Type(JsonType.class)} fields, this
 * delegates to {@code ObjectMapperJsonSerializer.clone()} — implementation dùng Java
 * serialization ({@code SerializationUtils.clone((Serializable) object)}). Nếu POJO
 * stored trong JSONB không implement {@link Serializable}, throws
 * {@code NonSerializableObjectException} → 500 Internal Server Error tại runtime.
 *
 * <p>Bug này silent — chỉ surface khi UPDATE (MERGE), không khi INSERT. Test này
 * scan compile-time để catch trước khi ship production.</p>
 *
 * <p><strong>Historical incidents:</strong></p>
 * <ul>
 *   <li>2026-04-27: {@code EnrollmentJpaEntity.LessonProgressData} → student lesson
 *       complete crash 500 (commit {@code 0b66b2b1})</li>
 *   <li>2026-04-27: {@code AssignmentRubricJpaEntity.RubricCriterion} +
 *       {@code RubricLevel} → assignment grading crash 500</li>
 * </ul>
 *
 * <p><strong>Rule:</strong> bất kỳ class nào được referenced trong type signature
 * của @Type(JsonType.class) field (List<X>, Map<K, X>, X itself) phải implement
 * Serializable nếu là POJO custom (không phải {@link java.util.Map},
 * {@link java.util.Collection}, hoặc Java built-in primitives).</p>
 */
@DisplayName("JSONB POJO Serializable Contract")
class JsonbSerializableTest {

    private static JavaClasses importedClasses;

    /**
     * Allowlist cho generic Object value types — JSON primitives được Jackson
     * deserialize thành Map/List/String/Number/Boolean (built-in Serializable).
     * Map<String, Object> field không trigger violation vì runtime values đều safe.
     */
    private static final Set<String> ALLOWED_BUILT_IN_TYPES = Set.of(
            "java.lang.Object",
            "java.lang.String",
            "java.lang.Integer", "java.lang.Long", "java.lang.Short", "java.lang.Byte",
            "java.lang.Double", "java.lang.Float",
            "java.lang.Boolean",
            "java.lang.Character",
            "java.math.BigDecimal", "java.math.BigInteger",
            "java.time.Instant", "java.time.LocalDate", "java.time.LocalDateTime",
            "java.time.OffsetDateTime", "java.time.ZonedDateTime",
            "java.util.UUID"
    );

    @BeforeAll
    static void importClasses() {
        importedClasses = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_JARS)
                .importPackages("com.example.lms");
    }

    @Test
    @DisplayName("POJO types stored trong JSONB phải implement Serializable")
    void jsonbPojoTypesMustImplementSerializable() {
        fields()
                .that(annotatedWithJsonType())
                .should(haveTypeArgumentsThatAreSerializable())
                .check(importedClasses);
    }

    private DescribedPredicate<JavaField> annotatedWithJsonType() {
        return new DescribedPredicate<>("annotated với @Type(JsonType.class)") {
            @Override
            public boolean test(JavaField field) {
                return field.getAnnotations().stream().anyMatch(annotation -> {
                    if (!annotation.getRawType().getFullName().equals(Type.class.getName())) {
                        return false;
                    }
                    Object value = annotation.get("value").orElse(null);
                    if (value == null) return false;
                    return value.toString().contains(JsonType.class.getName());
                });
            }
        };
    }

    private ArchCondition<JavaField> haveTypeArgumentsThatAreSerializable() {
        return new ArchCondition<>("only reference Serializable POJOs trong type arguments") {
            @Override
            public void check(JavaField field, ConditionEvents events) {
                JavaType fieldType = field.getType();
                checkType(fieldType, field, events);
            }

            private void checkType(JavaType type, JavaField field, ConditionEvents events) {
                // Recurse into parameterized types (List<X>, Map<K, V>, etc.)
                if (type instanceof JavaParameterizedType paramType) {
                    for (JavaType actualArg : paramType.getActualTypeArguments()) {
                        checkType(actualArg, field, events);
                    }
                    // Don't check raw type itself (List, Map are built-in Serializable)
                    return;
                }

                JavaClass rawClass = type.toErasure();
                String fullName = rawClass.getFullName();

                // Skip primitives + built-in safe types
                if (rawClass.isPrimitive() || ALLOWED_BUILT_IN_TYPES.contains(fullName)) {
                    return;
                }
                if (fullName.startsWith("java.")) {
                    // Java built-ins (List, Map, Set, etc.) — assumed Serializable nếu impl chuẩn
                    return;
                }

                // Custom POJO — must implement Serializable
                boolean isSerializable = rawClass.isAssignableTo(Serializable.class);
                if (!isSerializable) {
                    String message = String.format(
                            "Field %s.%s (@Type(JsonType.class)) references non-Serializable POJO %s. " +
                                    "Add `implements Serializable` + `private static final long serialVersionUID = 1L;` " +
                                    "to prevent NonSerializableObjectException during Hibernate merge.",
                            field.getOwner().getName(), field.getName(), fullName
                    );
                    events.add(SimpleConditionEvent.violated(field, message));
                }
            }
        };
    }
}
