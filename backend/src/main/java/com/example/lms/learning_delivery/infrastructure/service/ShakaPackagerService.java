package com.example.lms.learning_delivery.infrastructure.service;

import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class ShakaPackagerService {

    private static final int DEFAULT_SEGMENT_DURATION_SECONDS = 6;

    @Value("${app.video.adaptive-segment-duration-seconds:6}")
    private int segmentDurationSeconds;

    public PackageOutput packageAdaptive(UUID assetId, List<PackagerInput> inputs) throws IOException, InterruptedException {
        if (inputs == null || inputs.isEmpty()) {
            throw new IOException("No renditions are available for adaptive packaging");
        }

        Path outputDir = Files.createTempDirectory("video-package-" + assetId + "-");
        Files.createDirectories(outputDir.resolve("hls"));
        Files.createDirectories(outputDir.resolve("dash"));
        Files.createDirectories(outputDir.resolve("segments"));

        List<String> command = new ArrayList<>();
        command.add("packager");

        PackagerInput audioSource = inputs.stream()
                .filter(PackagerInput::hasAudio)
                .findFirst()
                .orElse(null);
        if (audioSource != null) {
            Files.createDirectories(outputDir.resolve("segments/audio"));
            command.add(buildAudioArgument(audioSource));
        }

        for (PackagerInput input : inputs.stream()
                .sorted(Comparator.comparingInt(PackagerInput::height))
                .toList()) {
            Files.createDirectories(outputDir.resolve("segments").resolve(slugify(input.profile())));
            command.add(buildVideoArgument(input));
        }

        command.add("--segment_duration");
        command.add(String.valueOf(resolveSegmentDurationSeconds()));
        command.add("--hls_master_playlist_output");
        command.add("hls/master.m3u8");
        command.add("--mpd_output");
        command.add("dash/manifest.mpd");

        runCommand(command, outputDir);

        List<PackagedFile> packagedFiles = Files.walk(outputDir)
                .filter(Files::isRegularFile)
                .sorted()
                .map(path -> new PackagedFile(
                        outputDir.relativize(path).toString().replace('\\', '/'),
                        path
                ))
                .toList();

        return new PackageOutput(
                outputDir,
                "hls/master.m3u8",
                "dash/manifest.mpd",
                packagedFiles
        );
    }

    private String buildAudioArgument(PackagerInput input) {
        return "in=" + input.sourcePath().toAbsolutePath()
                + ",stream=audio"
                + ",init_segment=segments/audio/init.mp4"
                + ",segment_template=segments/audio/$Number$.m4s"
                + ",playlist_name=hls/audio.m3u8"
                + ",hls_group_id=audio"
                + ",hls_name=Default";
    }

    private String buildVideoArgument(PackagerInput input) {
        String profileSlug = slugify(input.profile());
        return "in=" + input.sourcePath().toAbsolutePath()
                + ",stream=video"
                + ",init_segment=segments/" + profileSlug + "/init.mp4"
                + ",segment_template=segments/" + profileSlug + "/$Number$.m4s"
                + ",playlist_name=hls/" + profileSlug + ".m3u8"
                + ",iframe_playlist_name=hls/" + profileSlug + "-iframe.m3u8"
                + ",hls_name=" + input.displayLabel();
    }

    private void runCommand(List<String> command, Path workingDirectory) throws IOException, InterruptedException {
        log.info("[VideoAsset] Running Shaka Packager: {}", String.join(" ", command));
        Process process = new ProcessBuilder(command)
                .directory(workingDirectory.toFile())
                .redirectErrorStream(true)
                .start();

        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new IOException("Shaka Packager failed (" + exitCode + "): " + output);
        }
    }

    int resolveSegmentDurationSeconds() {
        return segmentDurationSeconds >= 2 ? segmentDurationSeconds : DEFAULT_SEGMENT_DURATION_SECONDS;
    }

    private String slugify(String value) {
        return value == null ? "unknown" : value.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-");
    }

    public record PackagerInput(
            String profile,
            String displayLabel,
            int height,
            Path sourcePath,
            boolean hasAudio
    ) {}

    public record PackagedFile(
            String relativePath,
            Path file
    ) {}

    public record PackageOutput(
            Path outputDirectory,
            String hlsManifestRelativePath,
            String dashManifestRelativePath,
            List<PackagedFile> files
    ) {}
}
