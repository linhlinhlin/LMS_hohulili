package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.service.CloudflareStreamService;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.domain.valueobject.CourseCode;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SectionVideoControllerV3Test {

    @Mock
    private CloudflareStreamService cloudflareStreamService;
    @Mock
    private LessonJpaRepository lessonRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private PaymentTransactionJpaRepository paymentRepository;

    @InjectMocks
    private SectionVideoControllerV3 controller;

    @Test
    @DisplayName("upload video persists streamVideoUid on the matching section content block")
    void uploadVideoPersistsSectionStreamIdentity() {
        UUID lessonId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        String sectionId = "section-video-1";

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .contentBlocks(List.of(ContentBlock.of(
                        sectionId,
                        "VIDEO",
                        Map.of("title", "Navigation video")
                )))
                .build();

        Course course = Course.create(CourseCode.of("NAV-101"), "Navigation", "Navigation course", teacherId);
        UserJpaEntity teacher = UserJpaEntity.builder()
                .id(teacherId)
                .role(UserJpaEntity.UserRole.TEACHER)
                .build();
        MockMultipartFile file = new MockMultipartFile("file", "nav.mp4", "video/mp4", new byte[] {1, 2, 3});

        when(cloudflareStreamService.isEnabled()).thenReturn(true);
        when(lessonRepository.findByContentBlockId(sectionId)).thenReturn(Optional.of(lesson));
        when(courseRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));
        when(cloudflareStreamService.uploadVideo(file, sectionId)).thenReturn(Optional.of(
                new CloudflareStreamService.CloudflareVideoMetadata(
                        "stream-123",
                        "https://videodelivery.net/stream-123/manifest/video.m3u8"
                )
        ));
        when(lessonRepository.save(any(LessonJpaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<Map<String, Object>> response = controller.uploadVideo(sectionId, file, teacher);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody())
                .containsEntry("sectionId", sectionId)
                .containsEntry("streamVideoUid", "stream-123")
                .containsEntry("playbackUrl", "https://videodelivery.net/stream-123/manifest/video.m3u8");

        ArgumentCaptor<LessonJpaEntity> lessonCaptor = ArgumentCaptor.forClass(LessonJpaEntity.class);
        verify(lessonRepository).save(lessonCaptor.capture());
        Map<String, Object> savedBlockData = lessonCaptor.getValue().getContentBlocks().getFirst().getData();
        assertThat(savedBlockData)
                .containsEntry("streamVideoUid", "stream-123")
                .containsEntry("videoType", "CLOUDFLARE")
                .containsEntry("videoUrl", "https://videodelivery.net/stream-123/manifest/video.m3u8");
    }

    @Test
    @DisplayName("play url falls back to legacy lesson streamVideoUid when section does not have its own uid")
    void getPlayUrlSupportsLegacyLessonFallback() {
        UUID lessonId = UUID.randomUUID();
        String sectionId = "section-video-legacy";

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .streamVideoUid("legacy-stream-uid")
                .contentBlocks(List.of(ContentBlock.of(
                        sectionId,
                        "VIDEO",
                        Map.of("title", "Legacy internal video")
                )))
                .build();

        UserJpaEntity admin = UserJpaEntity.builder()
                .id(UUID.randomUUID())
                .role(UserJpaEntity.UserRole.ADMIN)
                .build();

        when(lessonRepository.findByContentBlockId(sectionId)).thenReturn(Optional.of(lesson));
        when(cloudflareStreamService.getSignedPlaybackUrl("legacy-stream-uid")).thenReturn(Optional.of(
                "https://videodelivery.net/legacy-stream-uid/manifest/video.m3u8?token=abc"
        ));

        ResponseEntity<Map<String, Object>> response = controller.getPlayUrl(sectionId, admin);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody())
                .containsEntry("uid", "legacy-stream-uid")
                .containsEntry("sectionId", sectionId)
                .containsEntry("playUrl", "https://videodelivery.net/legacy-stream-uid/manifest/video.m3u8?token=abc");
    }

    @Test
    @DisplayName("student download url uses section stream uid when section-level identity exists")
    void getDownloadUrlUsesSectionStreamIdentityForStudents() {
        UUID lessonId = UUID.randomUUID();
        UUID courseTeacherId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        String sectionId = "section-video-download";

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .isFree(false)
                .contentBlocks(List.of(ContentBlock.of(
                        sectionId,
                        "VIDEO",
                        Map.of(
                                "title", "Engine room walk-through",
                                "streamVideoUid", "section-stream-uid"
                        )
                )))
                .build();

        Course course = Course.create(CourseCode.of("ENG-101"), "Engine room", "Course", courseTeacherId);
        course.updatePricing(Course.PriceType.PAID, BigDecimal.valueOf(1_000), BigDecimal.valueOf(1_000));

        UserJpaEntity student = UserJpaEntity.builder()
                .id(UUID.randomUUID())
                .role(UserJpaEntity.UserRole.STUDENT)
                .build();

        when(lessonRepository.findByContentBlockId(sectionId)).thenReturn(Optional.of(lesson));
        when(courseRepository.findByLessonId(lessonId)).thenReturn(Optional.of(course));
        when(paymentRepository.existsByStudentIdAndCourseIdAndStatus(
                student.getId(),
                course.getId(),
                com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity.PaymentStatus.COMPLETED
        )).thenReturn(true);
        when(cloudflareStreamService.getDownloadUrl("section-stream-uid", "720p")).thenReturn(Optional.of(
                "https://videodelivery.net/section-stream-uid/downloads/720p.mp4"
        ));

        ResponseEntity<Map<String, Object>> response = controller.getDownloadUrl(sectionId, "720p", student);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody())
                .containsEntry("uid", "section-stream-uid")
                .containsEntry("quality", "720p")
                .containsEntry("downloadUrl", "https://videodelivery.net/section-stream-uid/downloads/720p.mp4");
    }

    @Test
    @DisplayName("quality sizes use section-level stream uid when available")
    void getQualitySizesUsesSectionStreamIdentity() {
        String sectionId = "section-video-sizes";
        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(UUID.randomUUID())
                .contentBlocks(List.of(ContentBlock.of(
                        sectionId,
                        "VIDEO",
                        Map.of(
                                "title", "Radar overview",
                                "streamVideoUid", "section-stream-uid"
                        )
                )))
                .build();

        UserJpaEntity admin = UserJpaEntity.builder()
                .id(UUID.randomUUID())
                .role(UserJpaEntity.UserRole.ADMIN)
                .build();

        when(lessonRepository.findByContentBlockId(sectionId)).thenReturn(Optional.of(lesson));
        when(cloudflareStreamService.getQualitySizes("section-stream-uid")).thenReturn(Map.of(
                "360p", 12_000_000L,
                "720p", 28_000_000L
        ));

        ResponseEntity<Map<String, Object>> response = controller.getQualitySizes(sectionId, admin);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody())
                .containsEntry("uid", "section-stream-uid")
                .containsEntry("sectionId", sectionId);
        assertThat(response.getBody().get("sizes")).isEqualTo(Map.of(
                "360p", 12_000_000L,
                "720p", 28_000_000L
        ));
    }

    @Test
    @DisplayName("delete video clears section stream identity and does not clear legacy lesson uid for other video sections")
    void deleteVideoClearsOnlySectionIdentityWhenMultipleVideoSectionsExist() {
        UUID lessonId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        String sectionId = "section-video-delete";

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .streamVideoUid("legacy-lesson-stream")
                .contentBlocks(List.of(
                        ContentBlock.of(
                                sectionId,
                                "VIDEO",
                                Map.of(
                                        "title", "Own stream",
                                        "streamVideoUid", "section-stream-uid",
                                        "videoUrl", "https://videodelivery.net/section-stream-uid/manifest/video.m3u8",
                                        "videoType", "CLOUDFLARE"
                                )
                        ),
                        ContentBlock.of(
                                "section-video-2",
                                "VIDEO",
                                Map.of("title", "Another video")
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
        verify(cloudflareStreamService).deleteVideo("section-stream-uid");

        ArgumentCaptor<LessonJpaEntity> lessonCaptor = ArgumentCaptor.forClass(LessonJpaEntity.class);
        verify(lessonRepository).save(lessonCaptor.capture());
        LessonJpaEntity savedLesson = lessonCaptor.getValue();
        assertThat(savedLesson.getStreamVideoUid()).isEqualTo("legacy-lesson-stream");
        assertThat(savedLesson.getContentBlocks().getFirst().getData())
                .doesNotContainKeys("streamVideoUid", "videoType", "videoUrl");
        verify(cloudflareStreamService, never()).deleteVideo("legacy-lesson-stream");
    }
}
