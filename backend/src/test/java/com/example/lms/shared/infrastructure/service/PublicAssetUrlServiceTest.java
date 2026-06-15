package com.example.lms.shared.infrastructure.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PublicAssetUrlServiceTest {

    private final PublicAssetUrlService service = new PublicAssetUrlService(
            "https://cdn.holilihu.online/",
            "http://localhost:8088/uploads"
    );

    @Test
    void resolveCourseThumbnailUrlKeepsAbsoluteUrl() {
        assertThat(service.resolveCourseThumbnailUrl("https://cdn.example.com/course-thumbnails/cover.jpg"))
                .isEqualTo("https://cdn.example.com/course-thumbnails/cover.jpg");
    }

    @Test
    void resolveCourseThumbnailUrlPrefixesStorageKeyWithCdnBase() {
        assertThat(service.resolveCourseThumbnailUrl("course-thumbnails/711dafbd-8415-4642-8a12-870eaf843b91.jpg"))
                .isEqualTo("https://cdn.holilihu.online/course-thumbnails/711dafbd-8415-4642-8a12-870eaf843b91.jpg");
    }

    @Test
    void resolveCourseThumbnailUrlInfersCourseThumbnailFolderForBareImageName() {
        assertThat(service.resolveCourseThumbnailUrl("102127cb-9e3d-438a-ba90-299c524fd257.jpg"))
                .isEqualTo("https://cdn.holilihu.online/course-thumbnails/102127cb-9e3d-438a-ba90-299c524fd257.jpg");
    }

    @Test
    void resolveCourseThumbnailUrlStripsLegacyUploadsPrefix() {
        assertThat(service.resolveCourseThumbnailUrl("/uploads/course-thumbnails/aba3a11c-822b-4fc1-bd44-f7dcfa89a95f.png"))
                .isEqualTo("https://cdn.holilihu.online/course-thumbnails/aba3a11c-822b-4fc1-bd44-f7dcfa89a95f.png");
    }
}
