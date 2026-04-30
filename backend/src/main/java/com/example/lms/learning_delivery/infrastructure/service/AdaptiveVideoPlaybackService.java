package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoAssetJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoAssetJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AdaptiveVideoPlaybackService {

    private static final Pattern URI_ATTRIBUTE_PATTERN = Pattern.compile("URI=\"([^\"]+)\"");
    private static final Pattern DASH_URL_ATTRIBUTE_PATTERN = Pattern.compile("(initialization|media|sourceURL)=\"([^\"]+)\"");

    private final VideoAssetJpaRepository videoAssetRepository;
    private final AdaptiveVideoPlaybackCacheService adaptiveVideoPlaybackCacheService;
    private final VideoPlaybackTokenService videoPlaybackTokenService;

    @Value("${app.video.segment-presign-ttl-seconds:120}")
    private long segmentPresignTtlSeconds;

    @Value("${app.video.media-domain:}")
    private String mediaDomain;

    public Optional<PlaybackSession> createPlaybackSession(UUID assetId, UUID userId, String requestedFormat) {
        VideoAssetJpaEntity asset = videoAssetRepository.findById(assetId).orElse(null);
        if (asset == null) {
            return Optional.empty();
        }

        String format = videoPlaybackTokenService.normalizeFormat(requestedFormat);
        String manifestKey = resolveManifestKey(asset, format);
        if (manifestKey == null || manifestKey.isBlank()) {
            return Optional.empty();
        }
        if (!"READY".equalsIgnoreCase(asset.getStatus()) || !"READY".equalsIgnoreCase(asset.getAdaptivePackagingStatus())) {
            return Optional.empty();
        }

        String token = videoPlaybackTokenService.mintToken(assetId, userId, format);
        return Optional.of(new PlaybackSession(
                buildManifestUrl(assetId, token, format, manifestKey),
                assetId,
                "ADAPTIVE_R2",
                format
        ));
    }

    public String renderHlsManifest(UUID assetId, String token, String requestedStorageKey) throws IOException {
        VideoAssetJpaEntity asset = requirePlayableAsset(assetId);
        validateClaims(token, assetId, "hls");
        String storageKey = requestedStorageKey == null || requestedStorageKey.isBlank()
                ? asset.getHlsManifestStorageKey()
                : requestedStorageKey;

        ensureStorageKeyAllowed(assetId, storageKey);
        if (!storageKey.endsWith(".m3u8")) {
            throw new AccessDeniedException("Invalid HLS manifest key");
        }

        String manifest = readManifest(storageKey);
        return rewriteHlsManifest(assetId, token, storageKey, manifest);
    }

    public String renderDashManifest(UUID assetId, String token) throws IOException {
        VideoAssetJpaEntity asset = requirePlayableAsset(assetId);
        validateClaims(token, assetId, "dash");
        String storageKey = asset.getDashManifestStorageKey();
        ensureStorageKeyAllowed(assetId, storageKey);

        String manifest = readManifest(storageKey);
        return rewriteDashManifest(assetId, token, storageKey, manifest);
    }

    public String resolveObjectRedirect(UUID assetId, String token, String storageKey) {
        validateClaims(token, assetId, null);
        ensureStorageKeyAllowed(assetId, storageKey);
        String redirectUrl = adaptiveVideoPlaybackCacheService.createObjectRedirect(
                storageKey,
                Duration.ofSeconds(segmentPresignTtlSeconds)
        );
        if (redirectUrl == null || redirectUrl.isBlank()) {
            throw new IllegalStateException("Unable to create signed object redirect");
        }
        return redirectUrl;
    }

    /**
     * Probe object size + content-type for HEAD requests.
     * Avoids redirecting HEAD to a presigned-GET URL (R2 rejects with 403 because
     * AWS SigV4 binds the signature to the HTTP method).
     */
    public com.example.lms.shared.infrastructure.service.R2VideoStorageService.ObjectMetadata
            headObject(UUID assetId, String token, String storageKey) throws IOException {
        validateClaims(token, assetId, null);
        ensureStorageKeyAllowed(assetId, storageKey);
        return adaptiveVideoPlaybackCacheService.headObject(storageKey);
    }

    private VideoPlaybackTokenService.PlaybackClaims validateClaims(String token, UUID assetId, String expectedFormat) {
        VideoPlaybackTokenService.PlaybackClaims claims = videoPlaybackTokenService.parseAndValidate(token);
        if (!assetId.equals(claims.assetId())) {
            throw new AccessDeniedException("Playback token does not match the requested asset");
        }
        if (expectedFormat != null && !expectedFormat.equalsIgnoreCase(claims.format())) {
            throw new AccessDeniedException("Playback token does not allow this manifest format");
        }
        return claims;
    }

    private VideoAssetJpaEntity requirePlayableAsset(UUID assetId) {
        VideoAssetJpaEntity asset = videoAssetRepository.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException("Video asset does not exist"));
        if (!"READY".equalsIgnoreCase(asset.getStatus()) || !"READY".equalsIgnoreCase(asset.getAdaptivePackagingStatus())) {
            throw new IllegalStateException("Adaptive package is not ready for playback");
        }
        return asset;
    }

    private String resolveManifestKey(VideoAssetJpaEntity asset, String format) {
        return "dash".equalsIgnoreCase(format) ? asset.getDashManifestStorageKey() : asset.getHlsManifestStorageKey();
    }

    private String readManifest(String storageKey) throws IOException {
        try {
            return adaptiveVideoPlaybackCacheService.readManifest(storageKey);
        } catch (UncheckedIOException exception) {
            throw exception.getCause();
        }
    }

    private String buildManifestUrl(UUID assetId, String token, String format, String manifestKey) {
        if ("dash".equalsIgnoreCase(format)) {
            return "/api/v3/video-assets/" + assetId + "/adaptive/" + token + "/dash/manifest.mpd";
        }
        if (manifestKey != null && manifestKey.endsWith(".m3u8") && !manifestKey.endsWith("master.m3u8")) {
            return buildPlaylistUrl(assetId, token, manifestKey);
        }
        return "/api/v3/video-assets/" + assetId + "/adaptive/" + token + "/hls/master.m3u8";
    }

    private String rewriteHlsManifest(
            UUID assetId,
            String token,
            String manifestStorageKey,
            String manifest
    ) {
        String[] lines = manifest.replace("\r\n", "\n").split("\n", -1);
        StringBuilder builder = new StringBuilder();

        for (int index = 0; index < lines.length; index++) {
            String line = lines[index];
            String rewritten = line;

            if (line.startsWith("#")) {
                rewritten = rewriteUriAttributeLine(assetId, token, manifestStorageKey, line);
            } else if (!line.isBlank()) {
                String targetKey = resolveRelativeKey(manifestStorageKey, line.trim());
                rewritten = targetKey.endsWith(".m3u8")
                        ? buildPlaylistUrl(assetId, token, targetKey)
                        : buildObjectUrl(assetId, token, targetKey);
            }

            builder.append(rewritten);
            if (index < lines.length - 1) {
                builder.append('\n');
            }
        }

        return builder.toString();
    }

    private String rewriteDashManifest(
            UUID assetId,
            String token,
            String manifestStorageKey,
            String manifest
    ) {
        Matcher matcher = DASH_URL_ATTRIBUTE_PATTERN.matcher(manifest);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            String key = resolveRelativeKey(manifestStorageKey, matcher.group(2));
            String replacement = matcher.group(1) + "=\"" + buildObjectUrl(assetId, token, key) + "\"";
            matcher.appendReplacement(buffer, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }

    private String rewriteUriAttributeLine(
            UUID assetId,
            String token,
            String manifestStorageKey,
            String line
    ) {
        Matcher matcher = URI_ATTRIBUTE_PATTERN.matcher(line);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            String key = resolveRelativeKey(manifestStorageKey, matcher.group(1));
            String replacementValue = key.endsWith(".m3u8")
                    ? buildPlaylistUrl(assetId, token, key)
                    : buildObjectUrl(assetId, token, key);
            matcher.appendReplacement(buffer, Matcher.quoteReplacement("URI=\"" + replacementValue + "\""));
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }

    private String buildPlaylistUrl(UUID assetId, String token, String storageKey) {
        return "/api/v3/video-assets/" + assetId
                + "/adaptive/" + token
                + "/hls/playlist?key=" + urlEncode(storageKey);
    }

    private String buildObjectUrl(UUID assetId, String token, String storageKey) {
        if (isMediaDomainObjectDeliveryEnabled()) {
            return buildMediaObjectUrl(storageKey);
        }
        return "/api/v3/video-assets/" + assetId
                + "/adaptive/" + token
                + "/object?key=" + urlEncode(storageKey);
    }

    private boolean isMediaDomainObjectDeliveryEnabled() {
        return normalizedMediaDomain() != null && videoPlaybackTokenService.isMediaDomainEdgeAuthEnabled();
    }

    private String buildMediaObjectUrl(String storageKey) {
        String requestPath = "/" + storageKey;
        String verifyToken = videoPlaybackTokenService.mintEdgeObjectToken(requestPath);
        return normalizedMediaDomain() + requestPath + "?verify=" + urlEncode(verifyToken);
    }

    private String normalizedMediaDomain() {
        if (mediaDomain == null) {
            return null;
        }

        String value = mediaDomain.trim();
        if (value.isBlank()) {
            return null;
        }
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            value = "https://" + value;
        }
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
    }

    private void ensureStorageKeyAllowed(UUID assetId, String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            throw new AccessDeniedException("Requested storage key is missing");
        }
        String expectedPrefix = "video-packages/" + assetId + "/";
        if (!storageKey.startsWith(expectedPrefix)) {
            throw new AccessDeniedException("Requested storage key is outside of the video package");
        }
    }

    private String resolveRelativeKey(String manifestStorageKey, String reference) {
        if (reference == null || reference.isBlank()) {
            return manifestStorageKey;
        }
        if (reference.startsWith("http://") || reference.startsWith("https://")) {
            throw new AccessDeniedException("External manifest references are not allowed");
        }

        String normalizedReference = reference.split("\\?", 2)[0];
        if (normalizedReference.startsWith("/")) {
            return normalizeKey(normalizedReference.substring(1));
        }
        if (normalizedReference.startsWith("segments/")) {
            return normalizeKey(resolvePackageRoot(manifestStorageKey) + normalizedReference);
        }

        int lastSlashIndex = manifestStorageKey.lastIndexOf('/');
        String basePath = lastSlashIndex >= 0 ? manifestStorageKey.substring(0, lastSlashIndex + 1) : "";
        return normalizeKey(basePath + normalizedReference);
    }

    private String resolvePackageRoot(String manifestStorageKey) {
        if (manifestStorageKey == null || manifestStorageKey.isBlank()) {
            return "";
        }

        String[] segments = manifestStorageKey.split("/");
        if (segments.length < 2) {
            return "";
        }
        return segments[0] + "/" + segments[1] + "/";
    }

    private String normalizeKey(String key) {
        ArrayDeque<String> stack = new ArrayDeque<>();
        for (String segment : key.split("/")) {
            if (segment.isBlank() || ".".equals(segment)) {
                continue;
            }
            if ("..".equals(segment)) {
                if (!stack.isEmpty()) {
                    stack.removeLast();
                }
                continue;
            }
            stack.addLast(segment);
        }
        return String.join("/", stack);
    }

    private String urlEncode(String value) {
        // Preserve `$` literal: DASH template variables ($Number$, $Time$, $Bandwidth$,
        // $RepresentationID$, $SubNumber$ per ISO/IEC 23009-1 §5.3.9.4.4) must survive
        // the manifest rewrite so the player can substitute them before issuing the
        // request. Encoding `$` → `%24` makes Shaka/dash.js fail to recognize the
        // template, send the request with literal `%24Number%24.m4s`, and R2 returns
        // 404 (no such object). `$` is a sub-delim per RFC 3986 §2.2 and is legal
        // unencoded in query strings, so this is spec-safe.
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("%24", "$");
    }

    public record PlaybackSession(
            String playUrl,
            UUID videoAssetId,
            String videoSourceKind,
            String format
    ) {}
}
