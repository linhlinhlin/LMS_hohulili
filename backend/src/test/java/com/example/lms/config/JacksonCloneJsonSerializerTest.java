package com.example.lms.config;

import com.example.lms.shared.domain.model.ContentBlock;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression suite cho {@link JacksonCloneJsonSerializer}.
 *
 * <p>Lý do tồn tại: Phase 8 L3 hotfix (commit 6a8473ce) sửa type erasure trap
 * — old code clone Collection bằng 1 round-trip với Object.class element type
 * → POJO elements bị deserialize thành LinkedHashMap → ClassCastException khi
 * consumer cast về POJO. Bug đã hit production POST /api/v3/questions trong
 * ~2 giờ. Test này verify recursive clone preserve concrete element type
 * cho mọi shape JSONB collections trong codebase.</p>
 *
 * <p>Pattern Karpathy "every bugfix needs a test that fails before fix":
 * mỗi assertion ở đây sẽ thất bại nếu ai đó revert recursive clone về
 * batch round-trip.</p>
 */
class JacksonCloneJsonSerializerTest {

    private final JacksonCloneJsonSerializer serializer = new JacksonCloneJsonSerializer();

    @Nested
    @DisplayName("Primitives & immutable values — fast path return as-is")
    class FastPath {
        @Test
        void cloneNullReturnsNull() {
            assertThat(serializer.<Object>clone(null)).isNull();
        }

        @Test
        void cloneStringReturnsSameInstance() {
            String s = "hello";
            assertThat(serializer.clone(s)).isSameAs(s);
        }

        @Test
        void cloneNumberReturnsSameInstance() {
            Integer i = 42;
            assertThat(serializer.clone(i)).isSameAs(i);
        }

        @Test
        void cloneBooleanReturnsSameInstance() {
            assertThat(serializer.clone(Boolean.TRUE)).isSameAs(Boolean.TRUE);
        }

        @Test
        void cloneUuidReturnsSameInstance() {
            UUID id = UUID.randomUUID();
            assertThat(serializer.clone(id)).isSameAs(id);
        }

        @Test
        void cloneInstantReturnsSameInstance() {
            Instant now = Instant.now();
            assertThat(serializer.clone(now)).isSameAs(now);
        }
    }

    @Nested
    @DisplayName("List<POJO> — preserve element type (Phase 8 L3 regression guard)")
    class ListOfPojo {
        @Test
        void cloneListOfContentBlockPreservesElementType() {
            ContentBlock block = ContentBlock.builder()
                    .id(UUID.randomUUID().toString())
                    .type("VIDEO")
                    .data(Map.of("url", "https://example.com/video.mp4"))
                    .build();
            List<ContentBlock> original = List.of(block);

            List<ContentBlock> cloned = serializer.clone(original);

            // Critical: KHÔNG được là LinkedHashMap (cũ bug)
            assertThat(cloned).hasSize(1);
            assertThat(cloned.get(0)).isInstanceOf(ContentBlock.class);
            assertThat(cloned.get(0).getId()).isEqualTo(block.getId());
            assertThat(cloned.get(0).getType()).isEqualTo("VIDEO");
        }

        @Test
        void cloneListProducesNewInstance() {
            List<ContentBlock> original = new ArrayList<>();
            original.add(ContentBlock.builder().id("a").type("TEXT").data(Map.of()).build());

            List<ContentBlock> cloned = serializer.clone(original);

            assertThat(cloned).isNotSameAs(original);
            assertThat(cloned.get(0)).isNotSameAs(original.get(0));
        }

        @Test
        void cloneEmptyListReturnsEmpty() {
            List<ContentBlock> empty = new ArrayList<>();
            List<ContentBlock> cloned = serializer.clone(empty);
            assertThat(cloned).isEmpty();
            assertThat(cloned).isNotSameAs(empty);
        }

        @Test
        void cloneListWithMultiplePojosPreservesAllTypes() {
            List<ContentBlock> original = List.of(
                    ContentBlock.builder().id("1").type("TEXT").data(Map.of("html", "<p>x</p>")).build(),
                    ContentBlock.builder().id("2").type("VIDEO").data(Map.of("src", "v.mp4")).build(),
                    ContentBlock.builder().id("3").type("FILE").data(Map.of("url", "f.pdf")).build()
            );

            List<ContentBlock> cloned = serializer.clone(original);

            assertThat(cloned).hasSize(3);
            cloned.forEach(item -> assertThat(item).isInstanceOf(ContentBlock.class));
            assertThat(cloned).extracting(ContentBlock::getType)
                    .containsExactly("TEXT", "VIDEO", "FILE");
        }
    }

    @Nested
    @DisplayName("Map<K, POJO> — preserve value type (Enrollment.progress pattern)")
    class MapOfPojo {
        @Test
        void cloneMapWithPojoValuePreservesValueType() {
            ContentBlock value = ContentBlock.builder().id("x").type("TEXT").data(Map.of()).build();
            Map<String, ContentBlock> original = new LinkedHashMap<>();
            original.put("key1", value);

            Map<String, ContentBlock> cloned = serializer.clone(original);

            assertThat(cloned).hasSize(1);
            assertThat(cloned.get("key1")).isInstanceOf(ContentBlock.class);
            assertThat(cloned.get("key1").getId()).isEqualTo("x");
        }

        @Test
        void cloneLinkedHashMapPreservesInsertionOrder() {
            Map<String, String> original = new LinkedHashMap<>();
            original.put("first", "1");
            original.put("second", "2");
            original.put("third", "3");

            Map<String, String> cloned = serializer.clone(original);

            assertThat(cloned).isInstanceOf(LinkedHashMap.class);
            assertThat(cloned.keySet()).containsExactly("first", "second", "third");
        }

        @Test
        void cloneMapProducesNewInstance() {
            Map<String, String> original = new HashMap<>();
            original.put("k", "v");
            assertThat(serializer.clone(original)).isNotSameAs(original);
        }
    }

    @Nested
    @DisplayName("Set<POJO> — preserve element type")
    class SetOfPojo {
        @Test
        void cloneLinkedHashSetPreservesType() {
            Set<String> original = new LinkedHashSet<>(List.of("a", "b", "c"));
            Set<String> cloned = serializer.clone(original);
            assertThat(cloned).isInstanceOf(LinkedHashSet.class);
            assertThat(cloned).containsExactly("a", "b", "c");
        }
    }

    @Nested
    @DisplayName("Nested generics — Map<UUID, List<POJO>> + List<Map<...>>")
    class NestedGenerics {
        @Test
        void cloneMapOfListOfPojoPreservesNestedTypes() {
            ContentBlock block = ContentBlock.builder().id("b1").type("TEXT").data(Map.of()).build();
            Map<String, List<ContentBlock>> original = new LinkedHashMap<>();
            original.put("group1", List.of(block));

            Map<String, List<ContentBlock>> cloned = serializer.clone(original);

            assertThat(cloned.get("group1")).hasSize(1);
            assertThat(cloned.get("group1").get(0)).isInstanceOf(ContentBlock.class);
        }

        @Test
        void cloneListOfMapsPreservesValueTypes() {
            List<Map<String, Integer>> original = List.of(
                    Map.of("count", 5),
                    Map.of("count", 10)
            );

            List<Map<String, Integer>> cloned = serializer.clone(original);

            assertThat(cloned).hasSize(2);
            assertThat(cloned.get(0).get("count")).isEqualTo(5);
            assertThat(cloned.get(1).get("count")).isEqualTo(10);
        }
    }

    @Nested
    @DisplayName("Null safety in collections")
    class NullSafety {
        @Test
        void cloneListWithNullElementSucceeds() {
            List<String> original = new ArrayList<>();
            original.add("a");
            original.add(null);
            original.add("b");

            List<String> cloned = serializer.clone(original);

            assertThat(cloned).containsExactly("a", null, "b");
        }

        @Test
        void cloneMapWithNullValueSucceeds() {
            Map<String, String> original = new HashMap<>();
            original.put("a", "1");
            original.put("b", null);

            Map<String, String> cloned = serializer.clone(original);

            assertThat(cloned).containsKeys("a", "b");
            assertThat(cloned.get("b")).isNull();
        }
    }
}
