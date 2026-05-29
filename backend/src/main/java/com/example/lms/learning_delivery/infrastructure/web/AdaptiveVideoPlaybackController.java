package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.learning_delivery.infrastructure.service.AdaptiveVideoPlaybackService;
import com.example.lms.learning_delivery.infrastructure.service.VideoPlaybackDeliveryPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/video-assets")
@RequiredArgsConstructor
public class AdaptiveVideoPlaybackController {

    private final AdaptiveVideoPlaybackService adaptiveVideoPlaybackService;

    @Value("${app.video.object-redirect-cache-seconds:30}")
    private long backendObjectCacheSeconds = 30L;

    @Value("${app.video.segment-presign-ttl-seconds:120}")
    private long segmentPresignTtlSeconds = 120L;

    @GetMapping(value = "/{assetId}/adaptive/{token}/hls/master.m3u8", produces = "application/vnd.apple.mpegurl")
    public ResponseEntity<String> getHlsMasterManifest(
            @PathVariable UUID assetId,
            @PathVariable String token
    ) throws IOException {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.apple.mpegurl"))
                .body(adaptiveVideoPlaybackService.renderHlsManifest(assetId, token, null));
    }

    @GetMapping(value = "/{assetId}/adaptive/{token}/hls/playlist", produces = "application/vnd.apple.mpegurl")
    public ResponseEntity<String> getHlsPlaylist(
            @PathVariable UUID assetId,
            @PathVariable String token,
            @RequestParam String key
    ) throws IOException {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.apple.mpegurl"))
                .body(adaptiveVideoPlaybackService.renderHlsManifest(assetId, token, key));
    }

    @GetMapping(value = "/{assetId}/adaptive/{token}/dash/manifest.mpd", produces = "application/dash+xml")
    public ResponseEntity<String> getDashManifest(
            @PathVariable UUID assetId,
            @PathVariable String token
    ) throws IOException {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/dash+xml"))
                .body(adaptiveVideoPlaybackService.renderDashManifest(assetId, token));
    }

    @GetMapping("/{assetId}/adaptive/{token}/object")
    public ResponseEntity<byte[]> getObject(
            @PathVariable UUID assetId,
            @PathVariable String token,
            @RequestParam String key,
            @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader
    ) throws IOException {
        var object = adaptiveVideoPlaybackService.readObject(assetId, token, key, rangeHeader);
        HttpStatus status = object.contentRange() == null ? HttpStatus.OK : HttpStatus.PARTIAL_CONTENT;
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(status)
                .contentLength(object.contentLength())
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .header(HttpHeaders.CACHE_CONTROL, backendObjectCacheControl())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.VARY, "Authorization, Cookie");

        if (object.contentRange() != null && !object.contentRange().isBlank()) {
            builder.header(HttpHeaders.CONTENT_RANGE, object.contentRange());
        }
        MediaType contentType = normalizePlaybackContentType(object.contentType());
        if (contentType != null) {
            builder.contentType(contentType);
        }

        return builder.body(object.bytes());
    }

    /**
     * Handle HEAD probes from the player (range support detection) WITHOUT
     * redirecting to a presigned-GET URL. R2 rejects HEAD on a GET-bound
     * presigned URL with 403 because AWS SigV4 binds the signature to the
     * exact HTTP method.
     *
     * Instead we issue a single HeadObject against R2 ourselves and echo the
     * size + content-type to the client — cheaper than a redirect (no client
     * round-trip to R2) and method-safe.
     */
    @RequestMapping(value = "/{assetId}/adaptive/{token}/object", method = RequestMethod.HEAD)
    public ResponseEntity<Void> headObject(
            @PathVariable UUID assetId,
            @PathVariable String token,
            @RequestParam String key
    ) throws IOException {
        var meta = adaptiveVideoPlaybackService.headObject(assetId, token, key);
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .contentLength(meta.size())
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .header(HttpHeaders.CACHE_CONTROL, backendObjectCacheControl())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.VARY, "Authorization, Cookie");
        MediaType contentType = normalizePlaybackContentType(meta.contentType());
        if (contentType != null) {
            builder.contentType(contentType);
        }
        return builder.build();
    }

    private String backendObjectCacheControl() {
        long effectiveSeconds = VideoPlaybackDeliveryPolicy.effectiveObjectRedirectCacheSeconds(
                backendObjectCacheSeconds,
                segmentPresignTtlSeconds
        );
        return VideoPlaybackDeliveryPolicy.privatePlaybackCacheControl(effectiveSeconds);
    }

    private MediaType normalizePlaybackContentType(String rawContentType) {
        if (rawContentType == null || rawContentType.isBlank()) {
            return null;
        }

        MediaType mediaType = MediaType.parseMediaType(rawContentType);
        String type = mediaType.getType() + "/" + mediaType.getSubtype();
        if ("video/iso.segment".equalsIgnoreCase(type) || "video/mp4".equalsIgnoreCase(type)) {
            return MediaType.parseMediaType(type);
        }
        return mediaType;
    }
}
