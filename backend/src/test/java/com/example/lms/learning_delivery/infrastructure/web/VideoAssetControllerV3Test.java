package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.service.AdaptiveVideoPlaybackService;
import com.example.lms.learning_delivery.infrastructure.service.VideoAssetLifecycleService;
import com.example.lms.learning_delivery.infrastructure.service.VideoAssetPresentationService;
import com.example.lms.learning_delivery.infrastructure.service.VideoStorageManagementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VideoAssetControllerV3Test {

    @Mock
    private VideoAssetLifecycleService videoAssetLifecycleService;
    @Mock
    private VideoAssetPresentationService videoAssetPresentationService;
    @Mock
    private AdaptiveVideoPlaybackService adaptiveVideoPlaybackService;
    @Mock
    private VideoStorageManagementService videoStorageManagementService;

    @Test
    @DisplayName("ORG_ADMIN can preview orphan cleanup")
    void orgAdminCanPreviewOrphanCleanup() {
        VideoAssetControllerV3 controller = newController();
        var result = cleanupResult(true);
        when(videoStorageManagementService.cleanupOrphanedAssets(true, 14, 20)).thenReturn(result);

        controller.cleanupOrphanedStorage(true, 14, 20, user(UserJpaEntity.UserRole.ORG_ADMIN));

        verify(videoStorageManagementService).cleanupOrphanedAssets(true, 14, 20);
    }

    @Test
    @DisplayName("ORG_ADMIN cannot execute destructive orphan cleanup")
    void orgAdminCannotExecuteOrphanCleanup() {
        VideoAssetControllerV3 controller = newController();

        assertThatThrownBy(() -> controller.cleanupOrphanedStorage(false, 14, 20, user(UserJpaEntity.UserRole.ORG_ADMIN)))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Only ADMIN");

        verify(videoStorageManagementService, never()).cleanupOrphanedAssets(false, 14, 20);
    }

    @Test
    @DisplayName("ADMIN can execute destructive orphan cleanup")
    void adminCanExecuteOrphanCleanup() {
        VideoAssetControllerV3 controller = newController();
        var result = cleanupResult(false);
        when(videoStorageManagementService.cleanupOrphanedAssets(false, 14, 20)).thenReturn(result);

        controller.cleanupOrphanedStorage(false, 14, 20, user(UserJpaEntity.UserRole.ADMIN));

        verify(videoStorageManagementService).cleanupOrphanedAssets(false, 14, 20);
    }

    private VideoAssetControllerV3 newController() {
        return new VideoAssetControllerV3(
                videoAssetLifecycleService,
                videoAssetPresentationService,
                adaptiveVideoPlaybackService,
                videoStorageManagementService
        );
    }

    private UserJpaEntity user(UserJpaEntity.UserRole role) {
        return UserJpaEntity.builder()
                .role(role)
                .build();
    }

    private VideoStorageManagementService.VideoCleanupResult cleanupResult(boolean dryRun) {
        return new VideoStorageManagementService.VideoCleanupResult(
                dryRun,
                14,
                20,
                0,
                0,
                0,
                List.of()
        );
    }
}
