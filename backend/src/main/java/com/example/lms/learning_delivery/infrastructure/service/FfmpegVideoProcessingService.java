package com.example.lms.learning_delivery.infrastructure.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FfmpegVideoProcessingService {

    private static final double DEFAULT_FRAME_RATE = 30.0;
    private static final double SEGMENT_TARGET_SECONDS = 2.0;

    private final ObjectMapper objectMapper;

    @Value("${app.video.ffmpeg-preset:veryfast}")
    private String ffmpegPreset;

    public VideoProbe probe(Path sourceFile) throws IOException, InterruptedException {
        ProcessResult result = runCommand(List.of(
                "ffprobe",
                "-v", "quiet",
                "-print_format", "json",
                "-show_streams",
                "-show_format",
                sourceFile.toString()
        ));

        JsonNode root = objectMapper.readTree(result.stdout());
        JsonNode streams = root.path("streams");
        JsonNode videoStream = null;
        boolean hasAudio = false;

        if (streams.isArray()) {
            for (JsonNode stream : streams) {
                String codecType = stream.path("codec_type").asText();
                if ("video".equals(codecType) && videoStream == null) {
                    videoStream = stream;
                }
                if ("audio".equals(codecType)) {
                    hasAudio = true;
                }
            }
        }

        if (videoStream == null) {
            throw new IOException("Source video does not contain a readable video stream");
        }

        int width = videoStream.path("width").asInt(0);
        int height = videoStream.path("height").asInt(0);
        int durationSeconds = resolveDurationSeconds(videoStream, root.path("format"));
        double frameRate = resolveFrameRate(videoStream);

        return new VideoProbe(width, height, durationSeconds, hasAudio, frameRate);
    }

    public Path transcodeMp4(Path sourceFile, UUID assetId, String profile, int targetHeight, boolean hasAudio, double frameRate)
            throws IOException, InterruptedException {
        List<TranscodedRendition> renditions = transcodeMp4Renditions(
                sourceFile,
                assetId,
                List.of(new TranscodeRequest(profile, targetHeight)),
                hasAudio,
                frameRate
        );
        if (renditions.isEmpty()) {
            throw new IOException("No rendition was generated for profile " + profile);
        }
        return renditions.getFirst().outputPath();
    }

    public List<TranscodedRendition> transcodeMp4Renditions(
            Path sourceFile,
            UUID assetId,
            List<TranscodeRequest> requests,
            boolean hasAudio,
            double frameRate
    ) throws IOException, InterruptedException {
        PreparedTranscodeBatch batch = prepareTranscodeBatch(sourceFile, assetId, requests, hasAudio, frameRate);
        if (batch.outputs().isEmpty()) {
            return List.of();
        }

        try {
            runCommand(batch.command());
            return batch.outputs().stream()
                    .map(output -> new TranscodedRendition(output.profile(), output.targetHeight(), output.outputPath()))
                    .toList();
        } catch (IOException | InterruptedException ex) {
            batch.outputs().forEach(output -> deleteQuietly(output.outputPath()));
            throw ex;
        }
    }

    PreparedTranscodeBatch prepareTranscodeBatch(
            Path sourceFile,
            UUID assetId,
            List<TranscodeRequest> requests,
            boolean hasAudio,
            double frameRate
    ) throws IOException {
        if (requests == null || requests.isEmpty()) {
            return new PreparedTranscodeBatch(List.of(), List.of());
        }

        List<TranscodeRequest> orderedRequests = requests.stream()
                .sorted(Comparator.comparingInt(TranscodeRequest::targetHeight))
                .toList();
        List<PreparedOutput> outputs = new ArrayList<>(orderedRequests.size());
        for (TranscodeRequest request : orderedRequests) {
            outputs.add(new PreparedOutput(
                    request.profile(),
                    request.targetHeight(),
                    Files.createTempFile("video-rendition-" + assetId + "-" + request.profile().toLowerCase(Locale.ROOT) + "-", ".mp4")
            ));
        }

        List<String> command = new ArrayList<>(List.of(
                "ffmpeg",
                "-y",
                "-i", sourceFile.toString(),
                "-filter_complex", buildFilterComplex(outputs)
        ));

        for (int index = 0; index < outputs.size(); index++) {
            PreparedOutput output = outputs.get(index);
            EncodingSettings settings = resolveEncodingSettings(output.profile(), output.targetHeight(), frameRate);

            command.addAll(List.of(
                    "-map", "[v" + index + "out]",
                    "-c:v", "libx264",
                    "-preset", resolveVideoPreset(),
                    "-profile:v", "main",
                    "-pix_fmt", "yuv420p",
                    "-b:v", settings.targetBitrateKbps() + "k",
                    "-maxrate", settings.maxBitrateKbps() + "k",
                    "-bufsize", settings.bufferSizeKbps() + "k",
                    "-g", String.valueOf(settings.gopSize()),
                    "-keyint_min", String.valueOf(settings.gopSize()),
                    "-sc_threshold", "0",
                    "-force_key_frames", "expr:gte(t,n_forced*" + SEGMENT_TARGET_SECONDS + ")",
                    "-crf", crfForProfile(output.profile()),
                    "-movflags", "+faststart"
            ));

            if (hasAudio) {
                command.addAll(List.of(
                        "-map", "0:a:0?",
                        "-c:a", "aac",
                        "-b:a", settings.audioBitrateKbps() + "k",
                        "-ac", "2",
                        "-ar", "48000"
                ));
            } else {
                command.add("-an");
            }

            command.add(output.outputPath().toString());
        }

        return new PreparedTranscodeBatch(command, outputs);
    }

    private int resolveDurationSeconds(JsonNode videoStream, JsonNode formatNode) {
        double duration = 0;
        if (videoStream.path("duration").isTextual() || videoStream.path("duration").isNumber()) {
            duration = videoStream.path("duration").asDouble(0);
        } else if (formatNode.path("duration").isTextual() || formatNode.path("duration").isNumber()) {
            duration = formatNode.path("duration").asDouble(0);
        }
        return duration <= 0 ? 0 : (int) Math.round(duration);
    }

    double resolveFrameRate(JsonNode videoStream) {
        double frameRate = parseFrameRate(videoStream.path("avg_frame_rate").asText(""));
        if (frameRate <= 0) {
            frameRate = parseFrameRate(videoStream.path("r_frame_rate").asText(""));
        }
        if (frameRate <= 0) {
            frameRate = DEFAULT_FRAME_RATE;
        }
        return frameRate;
    }

    double parseFrameRate(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return 0;
        }
        String value = rawValue.trim();
        if (value.contains("/")) {
            String[] parts = value.split("/", 2);
            if (parts.length != 2) {
                return 0;
            }
            double numerator = parseDouble(parts[0]);
            double denominator = parseDouble(parts[1]);
            if (numerator <= 0 || denominator <= 0) {
                return 0;
            }
            return numerator / denominator;
        }
        return parseDouble(value);
    }

    String resolveVideoPreset() {
        if (ffmpegPreset == null || ffmpegPreset.isBlank()) {
            return "veryfast";
        }
        return ffmpegPreset.trim().toLowerCase(Locale.ROOT);
    }

    private String crfForProfile(String profile) {
        return switch (profile) {
            case "SAVER" -> "31";
            case "HIGH" -> "25";
            default -> "28";
        };
    }

    EncodingSettings resolveEncodingSettings(String profile, int targetHeight, double frameRate) {
        int gopSize = resolveGopSize(frameRate);
        if (targetHeight <= 360 || "SAVER".equalsIgnoreCase(profile)) {
            return new EncodingSettings(700, 950, 1400, 96, gopSize);
        }
        if (targetHeight <= 480) {
            return new EncodingSettings(1100, 1600, 2200, 96, gopSize);
        }
        if (targetHeight <= 720 || "STANDARD".equalsIgnoreCase(profile)) {
            return new EncodingSettings(2200, 3200, 4400, 128, gopSize);
        }
        return new EncodingSettings(3800, 5500, 7600, 160, gopSize);
    }

    int resolveGopSize(double frameRate) {
        double normalizedFrameRate = frameRate > 0 ? frameRate : DEFAULT_FRAME_RATE;
        int candidate = (int) Math.round(normalizedFrameRate * SEGMENT_TARGET_SECONDS);
        return Math.max(24, Math.min(candidate, 120));
    }

    private double parseDouble(String value) {
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private String buildFilterComplex(List<PreparedOutput> outputs) {
        if (outputs.size() == 1) {
            return "[0:v]scale=-2:" + outputs.getFirst().targetHeight() + "[v0out]";
        }

        List<String> splitLabels = new ArrayList<>(outputs.size());
        for (int index = 0; index < outputs.size(); index++) {
            splitLabels.add("[v" + index + "src]");
        }

        List<String> filters = new ArrayList<>();
        filters.add("[0:v]split=" + outputs.size() + String.join("", splitLabels));
        for (int index = 0; index < outputs.size(); index++) {
            filters.add("[v" + index + "src]scale=-2:" + outputs.get(index).targetHeight() + "[v" + index + "out]");
        }
        return String.join(";", filters);
    }

    private void deleteQuietly(Path path) {
        if (path == null) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
            // best-effort temp cleanup
        }
    }

    private ProcessResult runCommand(List<String> command) throws IOException, InterruptedException {
        Process process = new ProcessBuilder(command)
                .redirectErrorStream(true)
                .start();

        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new IOException("Command failed (" + exitCode + "): " + String.join(" ", command) + "\n" + output);
        }
        return new ProcessResult(exitCode, output);
    }

    public record VideoProbe(int width, int height, int durationSeconds, boolean hasAudio, double frameRate) {}

    public record TranscodeRequest(
            String profile,
            int targetHeight
    ) {}

    public record TranscodedRendition(
            String profile,
            int targetHeight,
            Path outputPath
    ) {}

    record PreparedTranscodeBatch(
            List<String> command,
            List<PreparedOutput> outputs
    ) {}

    record PreparedOutput(
            String profile,
            int targetHeight,
            Path outputPath
    ) {}

    record EncodingSettings(
            int targetBitrateKbps,
            int maxBitrateKbps,
            int bufferSizeKbps,
            int audioBitrateKbps,
            int gopSize
    ) {}

    private record ProcessResult(int exitCode, String stdout) {}
}
