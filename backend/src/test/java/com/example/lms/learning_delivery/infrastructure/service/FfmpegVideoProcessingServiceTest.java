package com.example.lms.learning_delivery.infrastructure.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class FfmpegVideoProcessingServiceTest {

    private final FfmpegVideoProcessingService service = new FfmpegVideoProcessingService(new ObjectMapper());

    @Test
    @DisplayName("parseFrameRate understands fractional ffprobe values")
    void parseFrameRateSupportsFractionalInput() {
        assertThat(service.parseFrameRate("30000/1001")).isBetween(29.96, 29.98);
        assertThat(service.parseFrameRate("25/1")).isEqualTo(25.0);
        assertThat(service.parseFrameRate("0/0")).isZero();
    }

    @Test
    @DisplayName("resolveEncodingSettings returns a stable bitrate ladder")
    void resolveEncodingSettingsReturnsStableAdaptiveLadder() {
        FfmpegVideoProcessingService.EncodingSettings saver = service.resolveEncodingSettings("SAVER", 360, 29.97);
        FfmpegVideoProcessingService.EncodingSettings standard = service.resolveEncodingSettings("STANDARD", 720, 30.0);
        FfmpegVideoProcessingService.EncodingSettings high = service.resolveEncodingSettings("HIGH", 1080, 59.94);

        assertThat(saver.targetBitrateKbps()).isEqualTo(700);
        assertThat(saver.audioBitrateKbps()).isEqualTo(96);
        assertThat(standard.targetBitrateKbps()).isEqualTo(2200);
        assertThat(standard.maxBitrateKbps()).isEqualTo(3200);
        assertThat(high.targetBitrateKbps()).isEqualTo(3800);
        assertThat(high.gopSize()).isGreaterThanOrEqualTo(60);
    }

    @Test
    @DisplayName("resolveGopSize clamps unreasonable frame rates to safe bounds")
    void resolveGopSizeClampsToSafeBounds() {
        assertThat(service.resolveGopSize(0)).isEqualTo(60);
        assertThat(service.resolveGopSize(12)).isEqualTo(24);
        assertThat(service.resolveGopSize(120)).isEqualTo(120);
    }

    @Test
    @DisplayName("resolveVideoPreset normalizes env-driven presets safely")
    void resolveVideoPresetNormalizesConfiguredValue() {
        ReflectionTestUtils.setField(service, "ffmpegPreset", " SuperFast ");
        assertThat(service.resolveVideoPreset()).isEqualTo("superfast");

        ReflectionTestUtils.setField(service, "ffmpegPreset", " ");
        assertThat(service.resolveVideoPreset()).isEqualTo("veryfast");
    }

    @Test
    @DisplayName("prepareTranscodeBatch builds one-pass split graph for multiple renditions")
    void prepareTranscodeBatchBuildsSinglePassCommandForMultipleRenditions() throws IOException {
        FfmpegVideoProcessingService.PreparedTranscodeBatch batch = service.prepareTranscodeBatch(
                Path.of("source.mp4"),
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                List.of(
                        new FfmpegVideoProcessingService.TranscodeRequest("STANDARD", 720),
                        new FfmpegVideoProcessingService.TranscodeRequest("SAVER", 360)
                ),
                true,
                30.0
        );

        assertThat(batch.outputs()).hasSize(2);
        assertThat(batch.command()).containsSequence("ffmpeg", "-y", "-i", "source.mp4");
        assertThat(batch.command()).contains("-filter_complex");
        assertThat(batch.command()).contains("[0:v]split=2[v0src][v1src];[v0src]scale=-2:360[v0out];[v1src]scale=-2:720[v1out]");
        assertThat(batch.command()).contains("-map", "[v0out]");
        assertThat(batch.command()).contains("-map", "[v1out]");
        assertThat(batch.command()).contains("0:a:0?");
    }

    @Test
    @DisplayName("prepareTranscodeBatch keeps a simple graph for one rendition")
    void prepareTranscodeBatchUsesSingleScaleForOneRendition() throws IOException {
        FfmpegVideoProcessingService.PreparedTranscodeBatch batch = service.prepareTranscodeBatch(
                Path.of("source.mp4"),
                UUID.fromString("22222222-2222-2222-2222-222222222222"),
                List.of(new FfmpegVideoProcessingService.TranscodeRequest("SAVER", 360)),
                false,
                30.0
        );

        assertThat(batch.outputs()).singleElement()
                .extracting(FfmpegVideoProcessingService.PreparedOutput::targetHeight)
                .isEqualTo(360);
        assertThat(batch.command()).contains("[0:v]scale=-2:360[v0out]");
        assertThat(batch.command()).contains("-an");
    }
}
