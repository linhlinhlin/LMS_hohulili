package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.learning_delivery.infrastructure.service.AdaptiveVideoPlaybackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/video-assets")
@RequiredArgsConstructor
public class AdaptiveVideoPlaybackController {

    private final AdaptiveVideoPlaybackService adaptiveVideoPlaybackService;

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
    public ResponseEntity<Void> redirectObject(
            @PathVariable UUID assetId,
            @PathVariable String token,
            @RequestParam String key
    ) {
        String redirectUrl = adaptiveVideoPlaybackService.resolveObjectRedirect(assetId, token, key);
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, URI.create(redirectUrl).toString())
                .build();
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
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=30");
        if (meta.contentType() != null && !meta.contentType().isBlank()) {
            builder.contentType(MediaType.parseMediaType(meta.contentType()));
        }
        return builder.build();
    }
}
