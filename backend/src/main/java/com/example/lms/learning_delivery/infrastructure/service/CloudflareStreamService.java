package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.config.CloudflareStreamConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.*;

/**
 * Cloudflare Stream integration service.
 *
 * Responsibilities:
 * - Upload videos to Cloudflare Stream (returns stream_video_uid)
 * - Generate JWT-signed playback URLs (4h expiry, Cloudflare pattern)
 * - Provide quality-specific download URLs for offline use (360p/720p/1080p)
 * - Return real per-quality file sizes for download dialog
 *
 * All methods are no-ops when cloudflare.stream.enabled=false.
 * Set credentials in .env.prod:
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN,
 *   CLOUDFLARE_STREAM_KEY_ID, CLOUDFLARE_STREAM_PRIVATE_KEY (base64 PEM)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CloudflareStreamService {

    private final CloudflareStreamConfig config;
    private final ObjectMapper objectMapper;

    private static final String CF_API_BASE = "https://api.cloudflare.com/client/v4/accounts";
    private static final String CF_VIDEO_DELIVERY = "https://videodelivery.net";

    // ─── Public API ────────────────────────────────────────────────────

    public boolean isEnabled() {
        return config.isEnabled()
                && config.getAccountId() != null && !config.getAccountId().isBlank()
                && config.getApiToken() != null && !config.getApiToken().isBlank();
    }

    /**
     * Upload a video file to Cloudflare Stream.
     * Uses the direct upload (multipart) endpoint.
     *
     * @param file     the video file (MP4, MOV, WebM — max 200 GB)
     * @param lessonId used as the video name/metadata for identification
     * @return CloudflareVideoMetadata with uid + playbackId, or empty if disabled
     */
    public Optional<CloudflareVideoMetadata> uploadVideo(MultipartFile file, String lessonId) {
        if (!isEnabled()) return Optional.empty();

        try {
            RestTemplate rest = buildRestTemplate();
            String url = CF_API_BASE + "/" + config.getAccountId() + "/stream";

            HttpHeaders headers = buildAuthHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            org.springframework.util.LinkedMultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
            body.add("file", new org.springframework.core.io.ByteArrayResource(file.getBytes()) {
                @Override public String getFilename() { return file.getOriginalFilename(); }
            });
            body.add("meta", objectMapper.writeValueAsString(Map.of(
                    "name", "lesson-" + lessonId,
                    "lessonId", lessonId
            )));

            ResponseEntity<String> resp = rest.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            JsonNode root = objectMapper.readTree(resp.getBody());
            JsonNode result = root.path("result");
            String uid = result.path("uid").asText();
            String playbackId = result.path("playback").path("hls").asText();

            log.info("Uploaded video to Cloudflare Stream: uid={}, lessonId={}", uid, lessonId);
            return Optional.of(new CloudflareVideoMetadata(uid, playbackId));

        } catch (Exception e) {
            log.error("Cloudflare Stream upload failed for lessonId={}: {}", lessonId, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Generate a JWT-signed HLS playback URL.
     * Token is valid for config.tokenExpirySeconds (default 4h).
     *
     * Pattern: https://videodelivery.net/{uid}/manifest/video.m3u8?token={jwt}
     */
    public Optional<String> getSignedPlaybackUrl(String streamVideoUid) {
        if (!isEnabled() || streamVideoUid == null || streamVideoUid.isBlank()) {
            return Optional.empty();
        }
        if (config.getKeyId() == null || config.getPrivateKey() == null) {
            // No signing key configured — return unsigned URL (still works if not restricted)
            return Optional.of(CF_VIDEO_DELIVERY + "/" + streamVideoUid + "/manifest/video.m3u8");
        }
        try {
            String token = buildSignedToken(streamVideoUid);
            return Optional.of(CF_VIDEO_DELIVERY + "/" + streamVideoUid + "/manifest/video.m3u8?token=" + token);
        } catch (Exception e) {
            log.error("Failed to sign Cloudflare Stream playback token for uid={}: {}", streamVideoUid, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Get a quality-specific download URL for offline use.
     * Cloudflare Stream provides MP4 downloads at 360p/720p/1080p via:
     * https://videodelivery.net/{uid}/downloads/{quality}.mp4
     *
     * Note: MP4 download must be enabled on the Cloudflare Stream video
     * (set allowedOrigins or use the dashboard).
     *
     * @param quality one of "360p", "720p", "1080p"
     */
    public Optional<String> getDownloadUrl(String streamVideoUid, String quality) {
        if (!isEnabled() || streamVideoUid == null || streamVideoUid.isBlank()) {
            return Optional.empty();
        }
        // Validate quality
        Set<String> supported = Set.of("360p", "720p", "1080p");
        if (!supported.contains(quality)) {
            log.warn("Unsupported download quality requested: {}", quality);
            return Optional.empty();
        }
        // CF Stream download URL pattern
        String downloadUrl = CF_VIDEO_DELIVERY + "/" + streamVideoUid + "/downloads/" + quality + ".mp4";
        return Optional.of(downloadUrl);
    }

    /**
     * Fetch per-quality file sizes for a Cloudflare Stream video.
     * Used by the download dialog to show real (not heuristic) sizes.
     *
     * @return map of quality → bytes; empty map if disabled or API fails
     */
    public Map<String, Long> getQualitySizes(String streamVideoUid) {
        if (!isEnabled() || streamVideoUid == null || streamVideoUid.isBlank()) {
            return Map.of();
        }
        try {
            RestTemplate rest = buildRestTemplate();
            String url = CF_API_BASE + "/" + config.getAccountId() + "/stream/" + streamVideoUid;
            ResponseEntity<String> resp = rest.exchange(url, HttpMethod.GET, new HttpEntity<>(buildAuthHeaders()), String.class);
            JsonNode result = objectMapper.readTree(resp.getBody()).path("result");
            JsonNode downloads = result.path("downloads");

            Map<String, Long> sizes = new LinkedHashMap<>();
            for (String quality : List.of("360p", "720p", "1080p")) {
                JsonNode q = downloads.path(quality);
                if (!q.isMissingNode() && q.path("size").isNumber()) {
                    sizes.put(quality, q.path("size").asLong());
                }
            }
            return sizes;
        } catch (Exception e) {
            log.debug("Could not fetch CF Stream quality sizes for uid={}: {}", streamVideoUid, e.getMessage());
            return Map.of();
        }
    }

    /**
     * Delete a video from Cloudflare Stream (called when lesson is deleted).
     */
    public void deleteVideo(String streamVideoUid) {
        if (!isEnabled() || streamVideoUid == null || streamVideoUid.isBlank()) return;
        try {
            RestTemplate rest = buildRestTemplate();
            String url = CF_API_BASE + "/" + config.getAccountId() + "/stream/" + streamVideoUid;
            rest.exchange(url, HttpMethod.DELETE, new HttpEntity<>(buildAuthHeaders()), Void.class);
            log.info("Deleted Cloudflare Stream video uid={}", streamVideoUid);
        } catch (Exception e) {
            log.warn("Failed to delete CF Stream video uid={}: {}", streamVideoUid, e.getMessage());
        }
    }

    // ─── Value Object ──────────────────────────────────────────────────

    public record CloudflareVideoMetadata(String uid, String hlsPlaybackUrl) {}

    // ─── Private Helpers ───────────────────────────────────────────────

    private HttpHeaders buildAuthHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(config.getApiToken());
        h.setAccept(List.of(MediaType.APPLICATION_JSON));
        return h;
    }

    private RestTemplate buildRestTemplate() {
        return new RestTemplate();
    }

    /**
     * Build a JWT signed with the Cloudflare Stream RSA private key.
     * Format: RS256 JWT with {sub: uid, kid: keyId, exp, iat} claims.
     */
    private String buildSignedToken(String videoUid) throws Exception {
        long now = Instant.now().getEpochSecond();
        long exp = now + config.getTokenExpirySeconds();

        // Header
        Map<String, String> headerMap = Map.of("alg", "RS256", "kid", config.getKeyId());
        String headerB64 = base64UrlEncode(objectMapper.writeValueAsBytes(headerMap));

        // Payload
        Map<String, Object> claims = Map.of("sub", videoUid, "kid", config.getKeyId(), "iat", now, "exp", exp);
        String payloadB64 = base64UrlEncode(objectMapper.writeValueAsBytes(claims));

        // Signing input
        String signingInput = headerB64 + "." + payloadB64;
        byte[] signatureBytes = rsaSign(signingInput.getBytes(StandardCharsets.UTF_8));
        String sigB64 = base64UrlEncode(signatureBytes);

        return signingInput + "." + sigB64;
    }

    private byte[] rsaSign(byte[] data) throws Exception {
        // Decode base64 PEM (strips header/footer, handles newlines)
        String pemRaw = config.getPrivateKey()
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] keyBytes = Base64.getDecoder().decode(pemRaw);

        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
        PrivateKey privateKey = KeyFactory.getInstance("RSA").generatePrivate(spec);
        Signature sig = Signature.getInstance("SHA256withRSA");
        sig.initSign(privateKey);
        sig.update(data);
        return sig.sign();
    }

    private String base64UrlEncode(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }
}
