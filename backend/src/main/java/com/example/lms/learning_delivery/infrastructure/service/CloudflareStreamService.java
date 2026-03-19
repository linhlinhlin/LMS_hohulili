package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.config.CloudflareStreamConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Cloudflare Stream integration.
 *
 * Truths this service enforces:
 * - Cloudflare Stream is the online playback layer.
 * - LMS-managed offline renditions live elsewhere (R2 / local fallback), not inside Stream.
 * - Legacy Stream-backed downloads therefore expose a single ORIGINAL MP4 export via
 *   downloads/default.mp4 until the LMS asset pipeline provides richer offline renditions.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CloudflareStreamService {

    public static final List<String> LEGACY_DOWNLOAD_QUALITY_HINTS = List.of("144p", "360p", "480p", "720p", "1080p");

    private static final String CF_API_BASE = "https://api.cloudflare.com/client/v4/accounts";
    private static final String CF_VIDEO_DELIVERY = "https://videodelivery.net";

    private final CloudflareStreamConfig config;
    private final ObjectMapper objectMapper;

    public boolean isEnabled() {
        return config.isEnabled()
                && config.getAccountId() != null && !config.getAccountId().isBlank()
                && config.getApiToken() != null && !config.getApiToken().isBlank();
    }

    public Optional<CloudflareVideoMetadata> uploadVideo(MultipartFile file, String lessonId) {
        if (!isEnabled()) {
            return Optional.empty();
        }

        try {
            RestTemplate rest = buildRestTemplate();
            String url = CF_API_BASE + "/" + config.getAccountId() + "/stream";

            HttpHeaders headers = buildAuthHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            });
            body.add("meta", objectMapper.writeValueAsString(Map.of(
                    "name", "lesson-" + lessonId,
                    "lessonId", lessonId
            )));

            ResponseEntity<String> response = rest.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            JsonNode result = objectMapper.readTree(response.getBody()).path("result");
            String uid = result.path("uid").asText();
            String playbackUrl = result.path("playback").path("hls").asText();

            log.info("Uploaded video to Cloudflare Stream: uid={}, lessonId={}", uid, lessonId);
            return Optional.of(new CloudflareVideoMetadata(uid, playbackUrl));
        } catch (Exception e) {
            log.error("Cloudflare Stream upload failed for lessonId={}: {}", lessonId, e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<CloudflareVideoMetadata> uploadVideo(Path filePath, String assetLabel) {
        if (!isEnabled()) {
            return Optional.empty();
        }

        try {
            RestTemplate rest = buildRestTemplate();
            String url = CF_API_BASE + "/" + config.getAccountId() + "/stream";

            HttpHeaders headers = buildAuthHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new FileSystemResource(filePath));
            body.add("meta", objectMapper.writeValueAsString(Map.of(
                    "name", assetLabel,
                    "source", "video-asset-pipeline"
            )));

            ResponseEntity<String> response = rest.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            JsonNode result = objectMapper.readTree(response.getBody()).path("result");
            String uid = result.path("uid").asText();
            String playbackUrl = result.path("playback").path("hls").asText();

            log.info("Uploaded video to Cloudflare Stream via file path: uid={}, asset={}", uid, assetLabel);
            return Optional.of(new CloudflareVideoMetadata(uid, playbackUrl));
        } catch (Exception e) {
            log.error("Cloudflare Stream file-path upload failed for asset={}: {}", assetLabel, e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<String> getSignedPlaybackUrl(String streamVideoUid) {
        if (!isEnabled() || streamVideoUid == null || streamVideoUid.isBlank()) {
            return Optional.empty();
        }
        if (config.getKeyId() == null || config.getPrivateKey() == null) {
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
     * Compatibility helper for callers that still send 144p/480p-style hints.
     * Cloudflare Stream returns the same default MP4 export for all of them here.
     */
    public Optional<String> getDownloadUrl(String streamVideoUid, String qualityHint) {
        if (!isEnabled() || streamVideoUid == null || streamVideoUid.isBlank()) {
            return Optional.empty();
        }
        if (qualityHint != null && !qualityHint.isBlank() && !Set.copyOf(LEGACY_DOWNLOAD_QUALITY_HINTS).contains(qualityHint)) {
            log.warn("Unsupported legacy Stream quality hint requested: {}", qualityHint);
            return Optional.empty();
        }
        return Optional.of(CF_VIDEO_DELIVERY + "/" + streamVideoUid + "/downloads/default.mp4");
    }

    public Optional<OfflineVideoDownloadTarget> resolveDownloadTarget(String streamVideoUid, String requestedProfile) {
        if (!isEnabled() || streamVideoUid == null || streamVideoUid.isBlank()) {
            return Optional.empty();
        }

        return getDownloadUrl(streamVideoUid, null)
                .map(downloadUrl -> new OfflineVideoDownloadTarget(
                        "ORIGINAL",
                        "Bản gốc",
                        null,
                        getOriginalDownloadSize(streamVideoUid).orElse(null),
                        downloadUrl
                ));
    }

    public List<OfflineVideoProfileOption> getAvailableOfflineProfiles(String streamVideoUid) {
        if (!isEnabled() || streamVideoUid == null || streamVideoUid.isBlank()) {
            return List.of();
        }

        Long sizeBytes = getOriginalDownloadSize(streamVideoUid).orElse(null);
        return getDownloadUrl(streamVideoUid, null)
                .map(ignored -> List.of(new OfflineVideoProfileOption(
                        "ORIGINAL",
                        "Bản gốc",
                        null,
                        sizeBytes
                )))
                .orElseGet(List::of);
    }

    /**
     * Legacy compatibility helper. Stream-backed legacy videos do not expose grouped offline sizes.
     */
    public Map<String, Long> getQualitySizes(String streamVideoUid) {
        return Map.of();
    }

    public void deleteVideo(String streamVideoUid) {
        if (!isEnabled() || streamVideoUid == null || streamVideoUid.isBlank()) {
            return;
        }
        try {
            RestTemplate rest = buildRestTemplate();
            String url = CF_API_BASE + "/" + config.getAccountId() + "/stream/" + streamVideoUid;
            rest.exchange(url, HttpMethod.DELETE, new HttpEntity<>(buildAuthHeaders()), Void.class);
            log.info("Deleted Cloudflare Stream video uid={}", streamVideoUid);
        } catch (Exception e) {
            log.warn("Failed to delete CF Stream video uid={}: {}", streamVideoUid, e.getMessage());
        }
    }

    public record CloudflareVideoMetadata(String uid, String hlsPlaybackUrl) {}

    public record OfflineVideoDownloadTarget(
            String profile,
            String profileLabel,
            String actualResolution,
            Long fileSizeBytes,
            String downloadUrl
    ) {}

    public record OfflineVideoProfileOption(
            String profile,
            String profileLabel,
            String actualResolution,
            Long fileSizeBytes
    ) {}

    private HttpHeaders buildAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(config.getApiToken());
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        return headers;
    }

    private RestTemplate buildRestTemplate() {
        return new RestTemplate();
    }

    private String buildSignedToken(String videoUid) throws Exception {
        long now = Instant.now().getEpochSecond();
        long exp = now + config.getTokenExpirySeconds();

        Map<String, String> headerMap = Map.of("alg", "RS256", "kid", config.getKeyId());
        String headerB64 = base64UrlEncode(objectMapper.writeValueAsBytes(headerMap));

        Map<String, Object> claims = Map.of("sub", videoUid, "kid", config.getKeyId(), "iat", now, "exp", exp);
        String payloadB64 = base64UrlEncode(objectMapper.writeValueAsBytes(claims));

        String signingInput = headerB64 + "." + payloadB64;
        byte[] signatureBytes = rsaSign(signingInput.getBytes(StandardCharsets.UTF_8));
        return signingInput + "." + base64UrlEncode(signatureBytes);
    }

    private byte[] rsaSign(byte[] data) throws Exception {
        byte[] keyBytes = decodePrivateKeyBytes(config.getPrivateKey());

        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
        PrivateKey privateKey = KeyFactory.getInstance("RSA").generatePrivate(spec);
        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(privateKey);
        signature.update(data);
        return signature.sign();
    }

    private byte[] decodePrivateKeyBytes(String rawPrivateKey) {
        if (rawPrivateKey == null || rawPrivateKey.isBlank()) {
            throw new IllegalArgumentException("Cloudflare Stream private key is blank");
        }

        String normalized = stripWrappingQuotes(rawPrivateKey.trim())
                .replace("\\n", "\n");

        if (containsPkcs8PemMarkers(normalized)) {
            return decodePemBody(normalized);
        }

        byte[] base64Decoded = Base64.getDecoder().decode(normalized.replaceAll("\\s", ""));
        String decodedText = new String(base64Decoded, StandardCharsets.UTF_8);
        if (containsPkcs8PemMarkers(decodedText)) {
            return decodePemBody(decodedText);
        }

        return base64Decoded;
    }

    private boolean containsPkcs8PemMarkers(String value) {
        return value != null
                && value.contains("-----BEGIN PRIVATE KEY-----")
                && value.contains("-----END PRIVATE KEY-----");
    }

    private byte[] decodePemBody(String pemText) {
        String pemBody = pemText
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");

        if (pemBody.isBlank()) {
            throw new IllegalArgumentException("Cloudflare Stream private key PEM body is blank");
        }

        return Base64.getDecoder().decode(pemBody);
    }

    private String stripWrappingQuotes(String value) {
        if (value == null || value.length() < 2) {
            return value;
        }

        char first = value.charAt(0);
        char last = value.charAt(value.length() - 1);
        if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
            return value.substring(1, value.length() - 1).trim();
        }
        return value;
    }

    private String base64UrlEncode(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    private Optional<Long> getOriginalDownloadSize(String streamVideoUid) {
        try {
            String downloadUrl = getDownloadUrl(streamVideoUid, null).orElse(null);
            if (downloadUrl == null) {
                return Optional.empty();
            }

            RestTemplate rest = buildRestTemplate();
            Long size = rest.execute(downloadUrl, HttpMethod.HEAD, null, response -> response.getHeaders().getContentLength());
            return size != null && size > 0 ? Optional.of(size) : Optional.empty();
        } catch (Exception e) {
            log.debug("Could not fetch Cloudflare Stream original MP4 size for uid={}: {}", streamVideoUid, e.getMessage());
            return Optional.empty();
        }
    }
}
