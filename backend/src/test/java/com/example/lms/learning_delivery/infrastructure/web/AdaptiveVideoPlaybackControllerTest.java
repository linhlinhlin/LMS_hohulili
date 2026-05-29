package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.learning_delivery.infrastructure.service.AdaptiveVideoPlaybackService;
import com.example.lms.shared.infrastructure.service.R2VideoStorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdaptiveVideoPlaybackControllerTest {

    @Mock
    private AdaptiveVideoPlaybackService adaptiveVideoPlaybackService;

    @InjectMocks
    private AdaptiveVideoPlaybackController controller;

    @Test
    @DisplayName("object endpoint streams same-origin bytes with range headers")
    void objectEndpointStreamsSameOriginBytesWithRangeHeaders() throws Exception {
        UUID assetId = UUID.randomUUID();
        String token = "play-token";
        String key = "video-packages/" + assetId + "/segments/saver/1.m4s";
        String rangeHeader = "bytes=0-2";
        byte[] bytes = new byte[]{1, 2, 3};

        when(adaptiveVideoPlaybackService.readObject(assetId, token, key, rangeHeader))
                .thenReturn(new R2VideoStorageService.ObjectBytes(
                        bytes,
                        bytes.length,
                        "video/iso.segment",
                        "bytes 0-2/10"
                ));

        var response = controller.getObject(assetId, token, key, rangeHeader);

        assertThat(response.getStatusCode().value()).isEqualTo(206);
        assertThat(response.getHeaders().getFirst(HttpHeaders.LOCATION)).isNull();
        assertThat(response.getHeaders().getFirst(HttpHeaders.ACCEPT_RANGES)).isEqualTo("bytes");
        assertThat(response.getHeaders().getFirst(HttpHeaders.CACHE_CONTROL))
                .isEqualTo("private, max-age=30, s-maxage=0, must-revalidate");
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_RANGE)).isEqualTo("bytes 0-2/10");
        assertThat(response.getHeaders().getFirst(HttpHeaders.VARY)).isEqualTo("Authorization, Cookie");
        assertThat(response.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(response.getHeaders().getContentLength()).isEqualTo(bytes.length);
        assertThat(response.getHeaders().getContentType().toString()).isEqualTo("video/iso.segment");
        assertThat(response.getBody()).containsExactly(bytes);
    }

    @Test
    @DisplayName("object endpoint strips charset from binary video segment content type")
    void objectEndpointStripsCharsetFromBinaryVideoSegmentContentType() throws Exception {
        UUID assetId = UUID.randomUUID();
        String token = "play-token";
        String key = "video-packages/" + assetId + "/segments/saver/1.m4s";

        when(adaptiveVideoPlaybackService.readObject(assetId, token, key, null))
                .thenReturn(new R2VideoStorageService.ObjectBytes(
                        new byte[]{1},
                        1,
                        "video/iso.segment;charset=UTF-8",
                        null
                ));

        var response = controller.getObject(assetId, token, key, null);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getHeaders().getFirst(HttpHeaders.CACHE_CONTROL))
                .isEqualTo("private, max-age=30, s-maxage=0, must-revalidate");
        assertThat(response.getHeaders().getContentType().toString()).isEqualTo("video/iso.segment");
    }

    @Test
    @DisplayName("head endpoint strips charset from binary video segment content type")
    void headEndpointStripsCharsetFromBinaryVideoSegmentContentType() throws Exception {
        UUID assetId = UUID.randomUUID();
        String token = "play-token";
        String key = "video-packages/" + assetId + "/segments/saver/init.mp4";

        when(adaptiveVideoPlaybackService.headObject(assetId, token, key))
                .thenReturn(new R2VideoStorageService.ObjectMetadata(
                        10,
                        "video/mp4;charset=UTF-8"
                ));

        var response = controller.headObject(assetId, token, key);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getHeaders().getFirst(HttpHeaders.CACHE_CONTROL))
                .isEqualTo("private, max-age=30, s-maxage=0, must-revalidate");
        assertThat(response.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(response.getHeaders().getContentType().toString()).isEqualTo("video/mp4");
    }
}
