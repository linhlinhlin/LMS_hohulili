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
import static org.mockito.Mockito.verify;
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
    @DisplayName("renderDashManifest preserves $Number$ template in /object?key= so player can substitute")
    void renderDashManifestPreservesTemplateVariablesInObjectQuery() throws Exception {
        // Regression: production bug 2026-04-30. `urlEncode` encoded $Number$ → %24Number%24
        // so Shaka couldn't substitute → request URL had literal %24Number%24.m4s → R2 404.
        // Backend has no media-domain edge auth → falls back to /object?key= path. That
        // path is the one that broke; the media-domain path was already correct.
        UUID assetId = UUID.randomUUID();
        String token = "play-token";
        String manifestKey = "video-packages/" + assetId + "/dash/manifest.mpd";

        VideoAssetJpaEntity asset = VideoAssetJpaEntity.builder()
                .id(assetId)
                .status("READY")
                .adaptivePackagingStatus("READY")
                .dashManifestStorageKey(manifestKey)
                .build();

        when(videoAssetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(videoPlaybackTokenService.parseAndValidate(token)).thenReturn(
                new VideoPlaybackTokenService.PlaybackClaims(assetId, UUID.randomUUID(), "dash")
        );
        when(adaptiveVideoPlaybackCacheService.readManifest(manifestKey)).thenReturn("""
                <MPD>
                  <Representation initialization="segments/saver/init.mp4" media="segments/saver/$Number$.m4s" />
                </MPD>
                """);

        String rewritten = service.renderDashManifest(assetId, token);

        assertThat(rewritten)
                .contains("/object?key=")
                .contains("$Number$.m4s")
                .doesNotContain("%24Number%24");
    }

    @Test
    @DisplayName("resolveObjectRedirect returns a short-lived signed storage URL")
    void resolveObjectRedirectUsesVideoStorageReadUrl() {
        UUID assetId = UUID.randomUUID();
        String token = "play-token";
        String storageKey = "video-packages/" + assetId + "/segments/standard/1.m4s";

        VideoAssetJpaEntity asset = VideoAssetJpaEntity.builder()
                .id(assetId)
                .status("READY")
                .adaptivePackagingStatus("READY")
                .build();

        ReflectionTestUtils.setField(service, "segmentPresignTtlSeconds", 90L);
        when(videoAssetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(videoPlaybackTokenService.parseAndValidate(token)).thenReturn(
                new VideoPlaybackTokenService.PlaybackClaims(assetId, UUID.randomUUID(), "hls")
        );
        when(adaptiveVideoPlaybackCacheService.createObjectRedirect(storageKey, java.time.Duration.ofSeconds(90)))
                .thenReturn("https://signed.example/segment.m4s");

        String redirectUrl = service.resolveObjectRedirect(assetId, token, storageKey);

        assertThat(redirectUrl).isEqualTo("https://signed.example/segment.m4s");
    }

    @Test
    @DisplayName("resolveObjectRedirect allows duplicate assets to read canonical package objects")
    void resolveObjectRedirectAllowsCanonicalPackageForDuplicateAsset() {
        UUID canonicalAssetId = UUID.randomUUID();
        UUID duplicateAssetId = UUID.randomUUID();
        String token = "play-token";
        String storageKey = "video-packages/" + canonicalAssetId + "/segments/standard/1.m4s";

        VideoAssetJpaEntity duplicateAsset = VideoAssetJpaEntity.builder()
                .id(duplicateAssetId)
                .duplicateOfAssetId(canonicalAssetId)
                .status("READY")
                .adaptivePackagingStatus("READY")
                .build();

        ReflectionTestUtils.setField(service, "segmentPresignTtlSeconds", 90L);
        when(videoAssetRepository.findById(duplicateAssetId)).thenReturn(Optional.of(duplicateAsset));
        when(videoPlaybackTokenService.parseAndValidate(token)).thenReturn(
                new VideoPlaybackTokenService.PlaybackClaims(duplicateAssetId, UUID.randomUUID(), "hls")
        );
        when(adaptiveVideoPlaybackCacheService.createObjectRedirect(storageKey, java.time.Duration.ofSeconds(90)))
                .thenReturn("https://signed.example/canonical-segment.m4s");

        String redirectUrl = service.resolveObjectRedirect(duplicateAssetId, token, storageKey);

        assertThat(redirectUrl).isEqualTo("https://signed.example/canonical-segment.m4s");
    }

    @Test
    @DisplayName("readObject validates the playback token and reads same-origin bytes")
    void readObjectValidatesTokenAndReadsBytes() throws Exception {
        UUID assetId = UUID.randomUUID();
        String token = "play-token";
        String storageKey = "video-packages/" + assetId + "/segments/standard/1.m4s";
        String rangeHeader = "bytes=0-1023";
        var objectBytes = new com.example.lms.shared.infrastructure.service.R2VideoStorageService.ObjectBytes(
                new byte[]{1, 2, 3},
                3,
                "video/iso.segment",
                "bytes 0-2/10"
        );
        VideoAssetJpaEntity asset = VideoAssetJpaEntity.builder()
                .id(assetId)
                .status("READY")
                .adaptivePackagingStatus("READY")
                .build();

        when(videoAssetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(videoPlaybackTokenService.parseAndValidate(token)).thenReturn(
                new VideoPlaybackTokenService.PlaybackClaims(assetId, UUID.randomUUID(), "hls")
        );
        when(adaptiveVideoPlaybackCacheService.readObject(storageKey, rangeHeader)).thenReturn(objectBytes);

        var result = service.readObject(assetId, token, storageKey, rangeHeader);

        assertThat(result).isSameAs(objectBytes);
        verify(adaptiveVideoPlaybackCacheService).readObject(storageKey, rangeHeader);
    }
}
