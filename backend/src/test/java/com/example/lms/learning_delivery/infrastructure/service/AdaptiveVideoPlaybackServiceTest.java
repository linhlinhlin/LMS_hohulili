package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoAssetJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoAssetJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdaptiveVideoPlaybackServiceTest {

    @Mock
    private VideoAssetJpaRepository videoAssetRepository;
    @Mock
    private AdaptiveVideoPlaybackCacheService adaptiveVideoPlaybackCacheService;
    @Mock
    private VideoPlaybackTokenService videoPlaybackTokenService;

    @InjectMocks
    private AdaptiveVideoPlaybackService service;

    @Test
    @DisplayName("renderHlsManifest rewrites child playlist and segment URLs to tokenized backend paths")
    void renderHlsManifestRewritesUrls() throws Exception {
        UUID assetId = UUID.randomUUID();
        String token = "play-token";
        String manifestKey = "video-packages/" + assetId + "/hls/master.m3u8";

        VideoAssetJpaEntity asset = VideoAssetJpaEntity.builder()
                .id(assetId)
                .status("READY")
                .adaptivePackagingStatus("READY")
                .hlsManifestStorageKey(manifestKey)
                .build();

        when(videoAssetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(videoPlaybackTokenService.parseAndValidate(token)).thenReturn(
                new VideoPlaybackTokenService.PlaybackClaims(assetId, UUID.randomUUID(), "hls")
        );
        when(adaptiveVideoPlaybackCacheService.readManifest(manifestKey)).thenReturn("""
                #EXTM3U
                #EXT-X-STREAM-INF:BANDWIDTH=1200000
                saver.m3u8
                #EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Default",URI="audio.m3u8"
                """);

        String rewritten = service.renderHlsManifest(assetId, token, null);

        assertThat(rewritten)
                .contains("/api/v3/video-assets/" + assetId + "/adaptive/" + token + "/hls/playlist?key=")
                .doesNotContain("https://media.holilihu.online/")
                .contains("audio.m3u8");
    }

    @Test
    @DisplayName("renderHlsManifest rewrites media objects to media domain when edge auth is enabled")
    void renderHlsManifestUsesMediaDomainForObjectsWhenEnabled() throws Exception {
        UUID assetId = UUID.randomUUID();
        String token = "play-token";
        String manifestKey = "video-packages/" + assetId + "/hls/standard.m3u8";

        VideoAssetJpaEntity asset = VideoAssetJpaEntity.builder()
                .id(assetId)
                .status("READY")
                .adaptivePackagingStatus("READY")
                .hlsManifestStorageKey("video-packages/" + assetId + "/hls/master.m3u8")
                .build();

        ReflectionTestUtils.setField(service, "mediaDomain", "media.holilihu.online/");
        when(videoAssetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(videoPlaybackTokenService.parseAndValidate(token)).thenReturn(
                new VideoPlaybackTokenService.PlaybackClaims(assetId, UUID.randomUUID(), "hls")
        );
        when(videoPlaybackTokenService.isMediaDomainEdgeAuthEnabled()).thenReturn(true);
        when(videoPlaybackTokenService.mintEdgeObjectToken("/video-packages/" + assetId + "/segments/standard/init.mp4"))
                .thenReturn("1700000000-signature=");
        when(videoPlaybackTokenService.mintEdgeObjectToken("/video-packages/" + assetId + "/segments/standard/segment1.m4s"))
                .thenReturn("1700000000-signature=");
        when(adaptiveVideoPlaybackCacheService.readManifest(manifestKey)).thenReturn("""
                #EXTM3U
                #EXT-X-MAP:URI="segments/standard/init.mp4"
                #EXTINF:6.0,
                segments/standard/segment1.m4s
                """);

        String rewritten = service.renderHlsManifest(assetId, token, manifestKey);

        assertThat(rewritten)
                .contains("https://media.holilihu.online/video-packages/" + assetId + "/segments/standard/init.mp4?verify=")
                .contains("https://media.holilihu.online/video-packages/" + assetId + "/segments/standard/segment1.m4s?verify=")
                .doesNotContain("/object?key=");
    }

    @Test
    @DisplayName("renderHlsManifest keeps playlist URLs on backend even when media domain is enabled")
    void renderHlsManifestKeepsPlaylistsOnBackendWhenEnabled() throws Exception {
        UUID assetId = UUID.randomUUID();
        String token = "play-token";
        String manifestKey = "video-packages/" + assetId + "/hls/master.m3u8";

        VideoAssetJpaEntity asset = VideoAssetJpaEntity.builder()
                .id(assetId)
                .status("READY")
                .adaptivePackagingStatus("READY")
                .hlsManifestStorageKey(manifestKey)
                .build();

        ReflectionTestUtils.setField(service, "mediaDomain", "https://media.holilihu.online");
        when(videoAssetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(videoPlaybackTokenService.parseAndValidate(token)).thenReturn(
                new VideoPlaybackTokenService.PlaybackClaims(assetId, UUID.randomUUID(), "hls")
        );
        when(adaptiveVideoPlaybackCacheService.readManifest(manifestKey)).thenReturn("""
                #EXTM3U
                #EXT-X-STREAM-INF:BANDWIDTH=1200000
                saver.m3u8
                #EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Default",URI="audio.m3u8"
                """);

        String rewritten = service.renderHlsManifest(assetId, token, null);

        assertThat(rewritten)
                .contains("/api/v3/video-assets/" + assetId + "/adaptive/" + token + "/hls/playlist?key=")
                .doesNotContain("https://media.holilihu.online/");
    }

    @Test
    @DisplayName("renderDashManifest rewrites object URLs to media domain when edge auth is enabled")
    void renderDashManifestUsesMediaDomainForObjectsWhenEnabled() throws Exception {
        UUID assetId = UUID.randomUUID();
        String token = "play-token";
        String manifestKey = "video-packages/" + assetId + "/dash/manifest.mpd";

        VideoAssetJpaEntity asset = VideoAssetJpaEntity.builder()
                .id(assetId)
                .status("READY")
                .adaptivePackagingStatus("READY")
                .dashManifestStorageKey(manifestKey)
                .build();

        ReflectionTestUtils.setField(service, "mediaDomain", "https://media.holilihu.online");
        when(videoAssetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(videoPlaybackTokenService.parseAndValidate(token)).thenReturn(
                new VideoPlaybackTokenService.PlaybackClaims(assetId, UUID.randomUUID(), "dash")
        );
        when(videoPlaybackTokenService.isMediaDomainEdgeAuthEnabled()).thenReturn(true);
        when(videoPlaybackTokenService.mintEdgeObjectToken("/video-packages/" + assetId + "/segments/audio/init.mp4"))
                .thenReturn("1700000000-signature=");
        when(videoPlaybackTokenService.mintEdgeObjectToken("/video-packages/" + assetId + "/segments/audio/$Number$.m4s"))
                .thenReturn("1700000000-signature=");
        when(adaptiveVideoPlaybackCacheService.readManifest(manifestKey)).thenReturn("""
                <MPD>
                  <Representation initialization="segments/audio/init.mp4" media="segments/audio/$Number$.m4s" />
                </MPD>
                """);

        String rewritten = service.renderDashManifest(assetId, token);

        assertThat(rewritten)
                .contains("https://media.holilihu.online/video-packages/" + assetId + "/segments/audio/init.mp4?verify=")
                .contains("https://media.holilihu.online/video-packages/" + assetId + "/segments/audio/$Number$.m4s?verify=")
                .doesNotContain("/object?key=");
    }

    @Test
    @DisplayName("resolveObjectRedirect returns a short-lived signed storage URL")
    void resolveObjectRedirectUsesVideoStorageReadUrl() {
        UUID assetId = UUID.randomUUID();
        String token = "play-token";
        String storageKey = "video-packages/" + assetId + "/segments/standard/1.m4s";

        ReflectionTestUtils.setField(service, "segmentPresignTtlSeconds", 90L);
        when(videoPlaybackTokenService.parseAndValidate(token)).thenReturn(
                new VideoPlaybackTokenService.PlaybackClaims(assetId, UUID.randomUUID(), "hls")
        );
        when(adaptiveVideoPlaybackCacheService.createObjectRedirect(storageKey, java.time.Duration.ofSeconds(90)))
                .thenReturn("https://signed.example/segment.m4s");

        String redirectUrl = service.resolveObjectRedirect(assetId, token, storageKey);

        assertThat(redirectUrl).isEqualTo("https://signed.example/segment.m4s");
    }
}
