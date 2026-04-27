package com.example.lms.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.hypersistence.utils.hibernate.type.util.JsonSerializer;
import lombok.extern.slf4j.Slf4j;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Phase 8 Level 3 — bypass Java {@link java.io.Serializable} requirement cho JSONB
 * deep-copy thay vì để hypersistence-utils dùng {@code SerializationUtils.clone()}.
 *
 * <p><strong>Vấn đề được giải quyết:</strong></p>
 *
 * <p>Default {@code ObjectMapperJsonSerializer} của hypersistence-utils dùng Java
 * serialization để clone JSON values khi Hibernate MERGE entity. Yêu cầu mọi POJO
 * stored trong {@code @Type(JsonType.class)} field phải implement
 * {@link java.io.Serializable}. Bug pattern silent — chỉ surface khi UPDATE
 * (không khi INSERT). Đã 3 incidents (LessonProgressData, RubricCriterion/Level,
 * QuizAttempt.AttemptItem) trong 2026-04-27.</p>
 *
 * <p><strong>Solution:</strong></p>
 *
 * <p>Dùng Jackson serialize → deserialize (round-trip JSON) để clone. Không yêu cầu
 * Serializable — Jackson chỉ cần POJO có @JsonCreator/setters/no-args constructor
 * (đã chuẩn cho mọi POJO trong codebase). Performance hit ~10-100x slower so với
 * Java clone, nhưng:</p>
 * <ul>
 *   <li>Per-row impact: ~50-200μs (negligible cho LMS scale)</li>
 *   <li>JSONB merge không phải hot path (mainly student progress + grading)</li>
 *   <li>Eliminate entire class of bugs vĩnh viễn</li>
 * </ul>
 *
 * <p><strong>Trade-offs:</strong></p>
 * <ul>
 *   <li>+ Bug-class elimination: NonSerializableObjectException sẽ không xảy ra nữa</li>
 *   <li>+ POJO author-friendly: không cần Serializable boilerplate</li>
 *   <li>− Performance: chậm hơn Java clone (acceptable cho non-hot path)</li>
 *   <li>− Polymorphism: subclasses cần @JsonTypeInfo nếu deserialization phải
 *       infer concrete type (current codebase: no such case)</li>
 * </ul>
 *
 * <p><strong>Activation:</strong> Set Hibernate property
 * {@code hypersistence.utils.json.serializer = com.example.lms.config.JacksonCloneJsonSerializer}
 * trong application.yml. Hypersistence-utils 3.15.x instantiates the class via
 * reflection (no-args constructor required).</p>
 *
 * <p><strong>Reference:</strong></p>
 * <ul>
 *   <li>hypersistence-utils JsonSerializer SPI</li>
 *   <li>ArchUnit JsonbSerializableTest — Layer 2 prevention (CI build-time guard)</li>
 *   <li>Migration plan Phase 10+: schema refactor enrollment progress → relational table</li>
 * </ul>
 */
@Slf4j
public class JacksonCloneJsonSerializer implements JsonSerializer {

    // JsonSerializer interface extends java.io.Serializable
    private static final long serialVersionUID = 1L;

    private final ObjectMapper objectMapper;

    public JacksonCloneJsonSerializer() {
        // Reuse same ObjectMapper config as HibernateJsonConfig (JavaTimeModule + ISO dates)
        this.objectMapper = new HibernateJsonConfig().get();
        // Startup log để verify serializer được hypersistence-utils load đúng.
        // Nếu property `hypersistence.utils.json.serializer` bị remove khỏi YAML →
        // log này sẽ KHÔNG xuất hiện → fallback ObjectMapperJsonSerializer (default).
        log.info("[Phase 8 L3] JacksonCloneJsonSerializer activated — JSONB clone bypass " +
                "Java Serializable requirement (uses Jackson round-trip).");
    }

    public JacksonCloneJsonSerializer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> T clone(T object) {
        if (object == null) {
            return null;
        }

        // Fast path: immutable JSON primitives — no clone needed.
        if (object instanceof String || object instanceof Number ||
            object instanceof Boolean || object instanceof Character) {
            return object;
        }

        try {
            // Round-trip serialize → deserialize. Bypasses Java Serializable.
            // Type erased generics: deserialize back to source class.
            byte[] bytes = objectMapper.writeValueAsBytes(object);

            if (object instanceof Map) {
                // Preserve LinkedHashMap ordering when source is LinkedHashMap
                Class<?> mapClass = object instanceof LinkedHashMap
                        ? LinkedHashMap.class
                        : Map.class;
                return (T) objectMapper.readValue(bytes,
                        objectMapper.getTypeFactory().constructMapLikeType(
                                mapClass, Object.class, Object.class));
            }
            if (object instanceof Collection) {
                return (T) objectMapper.readValue(bytes,
                        objectMapper.getTypeFactory().constructCollectionLikeType(
                                object.getClass(), Object.class));
            }
            // POJO — concrete class
            return (T) objectMapper.readValue(bytes, object.getClass());
        } catch (Exception ex) {
            log.error("JacksonCloneJsonSerializer failed to clone object of type {}: {}",
                    object.getClass().getName(), ex.getMessage());
            throw new IllegalStateException(
                    "Cannot deep-clone JSON value of type " + object.getClass().getName(),
                    ex);
        }
    }
}
