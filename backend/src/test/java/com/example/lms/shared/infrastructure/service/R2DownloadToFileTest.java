package com.example.lms.shared.infrastructure.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

class R2DownloadToFileTest {

    @TempDir
    Path tempDir;

    @Test
    @DisplayName("public R2 download removes pre-created destination file before streaming")
    void r2StorageServiceDeletesExistingDestination() throws Exception {
        S3Client client = mock(S3Client.class);
        R2StorageService service = new R2StorageService(client);
        ReflectionTestUtils.setField(service, "bucket", "bucket");
        ReflectionTestUtils.setField(service, "publicUrl", "https://example.com");

        Path destination = Files.createTempFile(tempDir, "download-", ".bin");
        Files.writeString(destination, "stale");

        doAnswer(invocation -> {
            Path requestedDestination = invocation.getArgument(1);
            assertThat(Files.exists(requestedDestination)).isFalse();
            Files.writeString(requestedDestination, "fresh");
            return GetObjectResponse.builder().build();
        }).when(client).getObject(any(GetObjectRequest.class), any(Path.class));

        service.downloadToFile("video/source.mp4", destination);

        assertThat(Files.readString(destination)).isEqualTo("fresh");
    }

    @Test
    @DisplayName("private video R2 download removes pre-created destination file before streaming")
    void r2VideoStorageServiceDeletesExistingDestination() throws Exception {
        S3Client client = mock(S3Client.class);
        S3Presigner presigner = mock(S3Presigner.class);
        R2VideoStorageService service = new R2VideoStorageService(client, presigner);
        ReflectionTestUtils.setField(service, "videoBucket", "video-bucket");

        Path destination = Files.createTempFile(tempDir, "video-download-", ".mp4");
        Files.writeString(destination, "stale");

        doAnswer(invocation -> {
            Path requestedDestination = invocation.getArgument(1);
            assertThat(Files.exists(requestedDestination)).isFalse();
            Files.writeString(requestedDestination, "fresh-video");
            return GetObjectResponse.builder().build();
        }).when(client).getObject(any(GetObjectRequest.class), any(Path.class));

        service.downloadToFile("videos/source.mp4", destination);

        assertThat(Files.readString(destination)).isEqualTo("fresh-video");
    }
}
