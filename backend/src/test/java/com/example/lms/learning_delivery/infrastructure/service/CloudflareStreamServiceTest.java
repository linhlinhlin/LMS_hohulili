package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.config.CloudflareStreamConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.util.Base64;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.spy;

class CloudflareStreamServiceTest {

    @Test
    @DisplayName("legacy download url resolves to Cloudflare default mp4 export")
    void getDownloadUrlSupportsAdditionalRenditions() {
        CloudflareStreamConfig config = new CloudflareStreamConfig();
        config.setEnabled(true);
        config.setAccountId("cf-account");
        config.setApiToken("cf-token");

        CloudflareStreamService service = new CloudflareStreamService(config, new ObjectMapper());

        Optional<String> lowQualityUrl = service.getDownloadUrl("video-uid", "144p");
        Optional<String> standardQualityUrl = service.getDownloadUrl("video-uid", "480p");
        Optional<String> unsupportedQualityUrl = service.getDownloadUrl("video-uid", "240p");

        assertThat(lowQualityUrl)
                .contains("https://videodelivery.net/video-uid/downloads/default.mp4");
        assertThat(standardQualityUrl)
                .contains("https://videodelivery.net/video-uid/downloads/default.mp4");
        assertThat(unsupportedQualityUrl).isEmpty();
    }

    @Test
    @DisplayName("legacy stream download target resolves to original profile only")
    void resolveDownloadTargetUsesOriginalProfileOnly() {
        CloudflareStreamConfig config = new CloudflareStreamConfig();
        config.setEnabled(true);
        config.setAccountId("cf-account");
        config.setApiToken("cf-token");

        CloudflareStreamService service = spy(new CloudflareStreamService(config, new ObjectMapper()));

        Optional<CloudflareStreamService.OfflineVideoDownloadTarget> target =
                service.resolveDownloadTarget("video-uid", "STANDARD");

        assertThat(target).isPresent();
        assertThat(target.get().profile()).isEqualTo("ORIGINAL");
        assertThat(target.get().profileLabel()).isEqualTo("Bản gốc");
        assertThat(target.get().actualResolution()).isNull();
        assertThat(target.get().fileSizeBytes()).isNull();
        assertThat(target.get().downloadUrl())
                .isEqualTo("https://videodelivery.net/video-uid/downloads/default.mp4");
    }

    @Test
    @DisplayName("legacy stream offline profiles expose only original export")
    void getAvailableOfflineProfilesReturnsOriginalOnly() {
        CloudflareStreamConfig config = new CloudflareStreamConfig();
        config.setEnabled(true);
        config.setAccountId("cf-account");
        config.setApiToken("cf-token");

        CloudflareStreamService service = spy(new CloudflareStreamService(config, new ObjectMapper()));

        assertThat(service.getAvailableOfflineProfiles("video-uid"))
                .singleElement()
                .satisfies(profile -> {
                    assertThat(profile.profile()).isEqualTo("ORIGINAL");
                    assertThat(profile.profileLabel()).isEqualTo("Bản gốc");
                    assertThat(profile.actualResolution()).isNull();
                });
    }

    @Test
    @DisplayName("signed playback url supports raw base64 private key bodies")
    void getSignedPlaybackUrlSupportsRawBase64PrivateKeyBodies() throws Exception {
        String privateKeyBody = Base64.getEncoder().encodeToString(generatePrivateKeyDer());
        CloudflareStreamService service = buildSignedService(privateKeyBody);

        Optional<String> playbackUrl = service.getSignedPlaybackUrl("video-uid");

        assertThat(playbackUrl)
                .hasValueSatisfying(url -> assertThat(url)
                        .startsWith("https://videodelivery.net/video-uid/manifest/video.m3u8?token="));
    }

    @Test
    @DisplayName("signed playback url supports one-line PEM private keys")
    void getSignedPlaybackUrlSupportsOneLinePemPrivateKeys() throws Exception {
        String pem = buildPem(generatePrivateKeyDer());
        String oneLinePem = pem.replace("\r", "").replace("\n", "");
        CloudflareStreamService service = buildSignedService(oneLinePem);

        Optional<String> playbackUrl = service.getSignedPlaybackUrl("video-uid");

        assertThat(playbackUrl)
                .hasValueSatisfying(url -> assertThat(url)
                        .startsWith("https://videodelivery.net/video-uid/manifest/video.m3u8?token="));
    }

    @Test
    @DisplayName("signed playback url supports base64 wrapped full PEM values")
    void getSignedPlaybackUrlSupportsBase64WrappedFullPemValues() throws Exception {
        String pem = buildPem(generatePrivateKeyDer());
        String base64WrappedPem = Base64.getEncoder().encodeToString(pem.getBytes(StandardCharsets.UTF_8));
        CloudflareStreamService service = buildSignedService(base64WrappedPem);

        Optional<String> playbackUrl = service.getSignedPlaybackUrl("video-uid");

        assertThat(playbackUrl)
                .hasValueSatisfying(url -> assertThat(url)
                        .startsWith("https://videodelivery.net/video-uid/manifest/video.m3u8?token="));
    }

    private CloudflareStreamService buildSignedService(String privateKey) {
        CloudflareStreamConfig config = new CloudflareStreamConfig();
        config.setEnabled(true);
        config.setAccountId("cf-account");
        config.setApiToken("cf-token");
        config.setKeyId("signing-key-id");
        config.setPrivateKey(privateKey);
        return new CloudflareStreamService(config, new ObjectMapper());
    }

    private byte[] generatePrivateKeyDer() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        return generator.generateKeyPair().getPrivate().getEncoded();
    }

    private String buildPem(byte[] derBytes) {
        return "-----BEGIN PRIVATE KEY-----\n"
                + Base64.getMimeEncoder(64, "\n".getBytes(StandardCharsets.UTF_8)).encodeToString(derBytes)
                + "\n-----END PRIVATE KEY-----";
    }
}
