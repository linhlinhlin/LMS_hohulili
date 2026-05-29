package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.service.AdaptiveVideoPlaybackService;
import com.example.lms.learning_delivery.infrastructure.service.VideoAssetPresentationService;
import com.example.lms.learning_delivery.infrastructure.service.VideoBinaryStorageService;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.domain.valueobject.CourseCode;
import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SectionVideoControllerV3Test {

    @Mock
    private AdaptiveVideoPlaybackService adaptiveVideoPlaybackService;
    @Mock
    private VideoAssetPresentationService videoAssetPresentationService;
    @Mock
    private VideoBinaryStorageService videoBinaryStorageService;
    @Mock
    private LessonJpaRepository lessonRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private PaymentTransactionJpaRepository paymentRepository;

    @InjectMocks
    private SectionVideoControllerV3 controller;

    @Test
    @DisplayName("direct section video upload endpoint is retired in favor of video assets")
    void uploadVideoEndpointIsRetiredInFavorOfVideoAssets() {
        String sectionId = "section-video-1";
        UserJpaEntity teacher = UserJpaEntity.builder()
                .id(UUID.randomUUID())
                .role(UserJpaEntity.UserRole.TEACHER)
                .build();
        MockMultipartFile file = new MockMultipartFile("file", "nav.mp4", "video/mp4", new byte[]{1, 2, 3});

        ResponseEntity<Map<String, Object>> response = controller.uploadVideo(sectionId, file, teacher);

        assertThat(response.getStatusCode().value()).isEqualTo(410);
        assertThat(response.getBody())
                .containsEntry("error", "Direct section video upload has been retired. Use /api/v3/files/upload/init and /api/v3/video-assets/from-upload.");
        verify(lessonRepository, never()).findByContentBlockId(any());
        verifyNoInteractions(adaptiveVideoPlaybackService);
    }

    @Test
    @DisplayName("play url returns adaptive playback session for asset-backed sections")
    void getPlayUrlReturnsAdaptivePlaybackSession() {
        UUID lessonId = UUID.randomUUID();
        UUID videoAssetId = UUID.randomUUID();
        String sectionId = "section-video-adaptive";

        LessonJpaEntity lesson = lessonWithSection(lessonId, sectionId, Map.of(
                "title", "Adaptive internal video",
                "videoAssetId", videoAssetId.toString()
        ));

        UserJpaEntity student = paidStudent();
        Course course = paidCourse(lessonId, UUID.randomUUID());

        when(lessonRepository.findByContentBlockId(sectionId)).thenReturn(Optional.of(lesson));
        when(courseRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));
        when(paymentRepository.existsByStudentIdAndCourseIdAndStatus(
                student.getId(),
                course.getId(),
                PaymentTransactionJpaEntity.PaymentStatus.COMPLETED
        )).thenReturn(true);
        when(adaptiveVideoPlaybackService.createPlaybackSession(videoAssetId, student.getId(), "dash"))
                .thenReturn(Optional.of(new AdaptiveVideoPlaybackService.PlaybackSession(
                        "/api/v3/video-assets/" + videoAssetId + "/adaptive/token/dash/manifest.mpd",
                        videoAssetId,
                        "ADAPTIVE_R2",
                        "dash",
                        "MEDIA_DOMAIN_EDGE",
                        true
                )));

        ResponseEntity<Map<String, Object>> response = controller.getPlayUrl(sectionId, "dash", student);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody())
                .containsEntry("videoAssetId", videoAssetId.toString())
                .containsEntry("videoSourceKind", "ADAPTIVE_R2")
                .containsEntry("format", "dash")
                .containsEntry("cdnDeliveryMode", "MEDIA_DOMAIN_EDGE")
                .containsEntry("mediaDomainSegmentDeliveryEnabled", true)
                .containsEntry("sectionId", sectionId)
                .containsEntry("playUrl", "/api/v3/video-assets/" + videoAssetId + "/adaptive/token/dash/manifest.mpd");
    }

    @Test
    @DisplayName("asset-backed download url uses presigned storage target for offline profile")
    void getDownloadUrlUsesPresignedStorageForAssetProfile() {
        UUID lessonId = UUID.randomUUID();
        UUID courseTeacherId = UUID.randomUUID();
        UUID videoAssetId = UUID.randomUUID();
        String sectionId = "section-video-asset-download";

        LessonJpaEntity lesson = lessonWithSection(lessonId, sectionId, Map.of(
                "title", "Asset-backed safety video",
                "videoAssetId", videoAssetId.toString()
        ));

        Course course = paidCourse(lessonId, courseTeacherId);
        UserJpaEntity student = paidStudent();

        when(lessonRepository.findByContentBlockId(sectionId)).thenReturn(Optional.of(lesson));
        when(courseRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));
        when(paymentRepository.existsByStudentIdAndCourseIdAndStatus(
                student.getId(),
                course.getId(),
                PaymentTransactionJpaEntity.PaymentStatus.COMPLETED
        )).thenReturn(true);
        when(videoAssetPresentationService.resolveOfflineTarget(videoAssetId, "STANDARD")).thenReturn(Optional.of(
                new VideoAssetPresentationService.OfflineTargetView(
                        "STANDARD",
                        "Chuan",
                        "720p",
                        28_000_000L,
                        "video-renditions/" + videoAssetId + "/standard-720p.mp4"
                )
        ));
        when(videoBinaryStorageService.createReadUrl(eq("video-renditions/" + videoAssetId + "/standard-720p.mp4"), any(Duration.class)))
                .thenReturn("https://signed.example/video-standard.mp4");

        ResponseEntity<Map<String, Object>> response = controller.getDownloadUrl(sectionId, null, null, student);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody())
                .containsEntry("videoAssetId", videoAssetId.toString())
                .containsEntry("profile", "STANDARD")
                .containsEntry("profileLabel", "Chuan")
                .containsEntry("actualResolution", "720p")
                .containsEntry("fileSizeBytes", 28_000_000L)
                .containsEntry("downloadUrl", "https://signed.example/video-standard.mp4");
    }

    @Test
    @DisplayName("quality sizes expose grouped offline profiles for asset-backed videos")
    void getQualitySizesUsesAssetProfilesWhenVideoAssetExists() {
        UUID videoAssetId = UUID.randomUUID();
        String sectionId = "section-video-asset-sizes";
        LessonJpaEntity lesson = lessonWithSection(UUID.randomUUID(), sectionId, Map.of(
                "title", "Asset-backed video",
                "videoAssetId", videoAssetId.toString()
        ));

        UserJpaEntity admin = UserJpaEntity.builder()
                .id(UUID.randomUUID())
                .role(UserJpaEntity.UserRole.ADMIN)
                .build();

        when(lessonRepository.findByContentBlockId(sectionId)).thenReturn(Optional.of(lesson));
        when(videoAssetPresentationService.getView(videoAssetId)).thenReturn(Optional.of(
                new VideoAssetPresentationService.VideoAssetView(
                        videoAssetId,
                        "READY",
                        "READY",
                        "ADAPTIVE_R2",
                        "safety.mp4",
                        56_000_000L,
                        300,
                        1280,
                        720,
                        null,
                        null,
                        null,
                        "video-packages/" + videoAssetId + "/hls/master.m3u8",
                        "video-packages/" + videoAssetId + "/dash/manifest.mpd",
                        List.of(
                                new VideoAssetPresentationService.OfflineProfileView(
                                        "SAVER",
                                        "Tiet kiem du lieu",
                                        "360p",
                                        12_000_000L,
                                        "video-renditions/" + videoAssetId + "/saver-360p.mp4"
                                ),
                                new VideoAssetPresentationService.OfflineProfileView(
                                        "STANDARD",
                                        "Chuan",
                                        "720p",
                                        28_000_000L,
                                        "video-renditions/" + videoAssetId + "/standard-720p.mp4"
                                )
                        )
                )
        ));

        ResponseEntity<Map<String, Object>> response = controller.getQualitySizes(sectionId, admin);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody())
                .containsEntry("videoAssetId", videoAssetId.toString())
                .containsEntry("videoSourceKind", "ADAPTIVE_R2");
        assertThat(response.getBody().get("sizes")).isEqualTo(Map.of(
                "360p", 12_000_000L,
                "720p", 28_000_000L
        ));
    }

    @Test
    @DisplayName("delete video clears section asset metadata")
    void deleteVideoClearsSectionVideoAssetMetadata() {
        UUID lessonId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        String sectionId = "section-video-delete";

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .contentBlocks(List.of(
                        ContentBlock.of(
                                sectionId,
                                "VIDEO",
                                Map.of(
                                        "title", "Own asset",
                                        "videoAssetId", UUID.randomUUID().toString(),
                                        "videoUrl", "/api/v3/video-assets/test",
                                        "videoType", "ADAPTIVE_R2"
                                )
                        )
                ))
                .build();

        Course course = Course.create(CourseCode.of("MET-101"), "Meteorology", "Course", teacherId);
        UserJpaEntity teacher = UserJpaEntity.builder()
                .id(teacherId)
                .role(UserJpaEntity.UserRole.TEACHER)
                .build();

        when(lessonRepository.findByContentBlockId(sectionId)).thenReturn(Optional.of(lesson));
        when(courseRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));
        when(lessonRepository.save(any(LessonJpaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<Void> response = controller.deleteVideo(sectionId, teacher);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();

        ArgumentCaptor<LessonJpaEntity> lessonCaptor = ArgumentCaptor.forClass(LessonJpaEntity.class);
        verify(lessonRepository).save(lessonCaptor.capture());
        LessonJpaEntity savedLesson = lessonCaptor.getValue();
        assertThat(savedLesson.getContentBlocks().getFirst().getData())
                .doesNotContainKeys("videoAssetId", "videoType", "videoUrl", "streamVideoUid");
    }

    private LessonJpaEntity lessonWithSection(UUID lessonId, String sectionId, Map<String, Object> data) {
        return LessonJpaEntity.builder()
                .id(lessonId)
                .isFree(false)
                .contentBlocks(List.of(ContentBlock.of(sectionId, "VIDEO", data)))
                .build();
    }

    private UserJpaEntity paidStudent() {
        return UserJpaEntity.builder()
                .id(UUID.randomUUID())
                .role(UserJpaEntity.UserRole.STUDENT)
                .build();
    }

    private Course paidCourse(UUID lessonId, UUID teacherId) {
        Course course = Course.create(CourseCode.of("SAF-101"), "Safety course", "Course", teacherId);
        course.updatePricing(Course.PriceType.PAID, BigDecimal.valueOf(1_000), BigDecimal.valueOf(1_000));
        return course;
    }
}
