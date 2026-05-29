package com.example.lms.shared.infrastructure.web;

import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminStorageControllerV3Test {

    @Mock
    private FileAttachmentJpaRepository fileRepository;

    @Test
    @DisplayName("health exposes ready video CDN status without leaking the HMAC secret")
    void healthExposesReadyVideoCdnStatus() {
        AdminStorageControllerV3 controller = newController(
                true,
                "https://media.holilihu.online/",
                "media_hmac_query",
                "secret-value",
                "300",
                "60"
        );
        when(fileRepository.count()).thenReturn(7L);
        when(fileRepository.findOrphanedBefore(any(Instant.class))).thenReturn(List.of());

        var response = controller.health();
        Map<String, Object> data = response.getBody().getData();
        Map<String, Object> videoCdn = nestedMap(data, "videoCdn");

        assertThat(videoCdn)
                .containsEntry("cdnRequired", true)
                .containsEntry("cdnSegmentDeliveryReady", true)
                .containsEntry("cdnDeliveryMode", "MEDIA_DOMAIN_EDGE")
                .containsEntry("mediaDomain", "https://media.holilihu.online")
                .containsEntry("edgeAuthMode", "media_hmac_query")
                .containsEntry("edgeAuthConfigured", true)
                .containsEntry("edgeTokenExpirySeconds", 300L)
                .containsEntry("manifestCacheSeconds", 60L)
                .containsEntry("edgeTokenFreshEnough", true)
                .containsEntry("status", "READY");
        assertThat(videoCdn).doesNotContainKey("edgeHmacSecret");
        assertThat(videoCdn.get("requiredActions")).isEqualTo(List.of());
    }

    @Test
    @DisplayName("health lists required actions when production requires CDN but media edge auth is missing")
    void healthListsRequiredActionsWhenCdnRequiredButMissing() {
        AdminStorageControllerV3 controller = newController(
                true,
                "",
                "disabled",
                "",
                "300",
                "60"
        );
        when(fileRepository.count()).thenReturn(7L);
        when(fileRepository.findOrphanedBefore(any(Instant.class))).thenReturn(List.of());

        var response = controller.health();
        Map<String, Object> videoCdn = nestedMap(response.getBody().getData(), "videoCdn");

        assertThat(videoCdn)
                .containsEntry("cdnRequired", true)
                .containsEntry("cdnSegmentDeliveryReady", false)
                .containsEntry("cdnDeliveryMode", "BACKEND_OBJECT_PROXY")
                .containsEntry("status", "MISCONFIGURED");
        assertThat(stringList(videoCdn, "requiredActions"))
                .contains(
                        "Configure VIDEO_MEDIA_DOMAIN",
                        "Set VIDEO_EDGE_AUTH_MODE=media_hmac_query",
                        "Set VIDEO_EDGE_HMAC_SECRET"
                );
    }

    @Test
    @DisplayName("health marks CDN misconfigured when edge tokens expire before cached manifests")
    void healthMarksCdnMisconfiguredWhenEdgeTokenTtlIsTooShort() {
        AdminStorageControllerV3 controller = newController(
                true,
                "https://media.holilihu.online/",
                "media_hmac_query",
                "secret-value",
                "60",
                "60"
        );
        when(fileRepository.count()).thenReturn(7L);
        when(fileRepository.findOrphanedBefore(any(Instant.class))).thenReturn(List.of());

        Map<String, Object> videoCdn = nestedMap(controller.health().getBody().getData(), "videoCdn");

        assertThat(videoCdn)
                .containsEntry("cdnSegmentDeliveryReady", false)
                .containsEntry("edgeAuthConfigured", true)
                .containsEntry("edgeTokenFreshEnough", false)
                .containsEntry("status", "MISCONFIGURED");
        assertThat(stringList(videoCdn, "requiredActions"))
                .contains("Set VIDEO_EDGE_TOKEN_EXPIRY_SECONDS greater than VIDEO_MANIFEST_CACHE_SECONDS");
    }

    private AdminStorageControllerV3 newController(
            boolean cdnRequired,
            String mediaDomain,
            String edgeAuthMode,
            String edgeHmacSecret,
            String edgeTokenTtlSeconds,
            String manifestCacheSeconds
    ) {
        return new AdminStorageControllerV3(
                fileRepository,
                null,
                "lms-cdn",
                "lms-storage",
                "lms-storage",
                cdnRequired,
                mediaDomain,
                edgeAuthMode,
                edgeHmacSecret,
                edgeTokenTtlSeconds,
                manifestCacheSeconds
        );
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> nestedMap(Map<String, Object> value, String key) {
        return (Map<String, Object>) value.get(key);
    }

    @SuppressWarnings("unchecked")
    private List<String> stringList(Map<String, Object> value, String key) {
        return (List<String>) value.get(key);
    }
}
