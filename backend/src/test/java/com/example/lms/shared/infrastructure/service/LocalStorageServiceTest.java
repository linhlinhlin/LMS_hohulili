package com.example.lms.shared.infrastructure.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LocalStorageService")
class LocalStorageServiceTest {

    @TempDir
    Path tempDir;

    private LocalStorageService service;

    @BeforeEach
    void setUp() throws IOException {
        service = new LocalStorageService();
        ReflectionTestUtils.setField(service, "basePath", tempDir.toString());
        ReflectionTestUtils.setField(service, "baseUrl", "http://localhost:8088/uploads");
        service.init();
    }

    @Nested
    @DisplayName("upload")
    class UploadTests {

        @Test
        @DisplayName("tạo file trên filesystem")
        void upload_createsFile() throws IOException {
            var file = new MockMultipartFile("file", "test.jpg", "image/jpeg", "fake-image-data".getBytes());

            var result = service.upload(file, "course");

            Path uploaded = tempDir.resolve(result.storageKey());
            assertThat(uploaded).exists();
            assertThat(Files.readAllBytes(uploaded)).isEqualTo("fake-image-data".getBytes());
        }

        @Test
        @DisplayName("trả về URL đúng format")
        void upload_returnsCorrectUrl() throws IOException {
            var file = new MockMultipartFile("file", "photo.png", "image/png", "png-data".getBytes());

            var result = service.upload(file, "thumbnails");

            assertThat(result.publicUrl()).startsWith("http://localhost:8088/uploads/thumbnails/");
            assertThat(result.publicUrl()).endsWith(".png");
            assertThat(result.fileId()).isNotBlank();
            assertThat(result.storageKey()).startsWith("thumbnails/");
            assertThat(result.fileSize()).isEqualTo("png-data".getBytes().length);
        }

        @Test
        @DisplayName("tạo thư mục con nếu chưa có")
        void upload_createsSubdirectory() throws IOException {
            var file = new MockMultipartFile("file", "doc.pdf", "application/pdf", "pdf-data".getBytes());

            service.upload(file, "new-folder");

            assertThat(tempDir.resolve("new-folder")).isDirectory();
        }

        @Test
        @DisplayName("xử lý file không có extension")
        void upload_handlesNoExtension() throws IOException {
            var file = new MockMultipartFile("file", "noext", "application/octet-stream", "data".getBytes());

            var result = service.upload(file, "misc");

            assertThat(result.storageKey()).doesNotContain(".");
            assertThat(tempDir.resolve(result.storageKey())).exists();
        }
    }

    @Nested
    @DisplayName("delete")
    class DeleteTests {

        @Test
        @DisplayName("xóa file thành công")
        void delete_removesFile() throws IOException {
            var file = new MockMultipartFile("file", "delete-me.jpg", "image/jpeg", "data".getBytes());
            var result = service.upload(file, "temp");

            service.delete(result.storageKey());

            assertThat(tempDir.resolve(result.storageKey())).doesNotExist();
        }

        @Test
        @DisplayName("không lỗi khi file không tồn tại")
        void delete_nonExistentFile_noError() {
            service.delete("nonexistent/file.jpg");
            // No exception thrown
        }
    }

    @Nested
    @DisplayName("exists")
    class ExistsTests {

        @Test
        @DisplayName("trả true khi file tồn tại")
        void exists_returnsTrue() throws IOException {
            var file = new MockMultipartFile("file", "check.jpg", "image/jpeg", "data".getBytes());
            var result = service.upload(file, "check");

            assertThat(service.exists(result.storageKey())).isTrue();
        }

        @Test
        @DisplayName("trả false khi file không tồn tại")
        void exists_returnsFalse() {
            assertThat(service.exists("nonexistent/file.jpg")).isFalse();
        }
    }
}
