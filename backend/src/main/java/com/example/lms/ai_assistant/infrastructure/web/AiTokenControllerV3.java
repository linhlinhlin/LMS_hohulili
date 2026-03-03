package com.example.lms.ai_assistant.infrastructure.web;

import com.example.lms.ai_assistant.infrastructure.wiii.WiiiTokenExchangeAdapter;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller for LMS users to obtain AI service JWT tokens.
 *
 * <p>Flow:
 * <ol>
 *   <li>LMS frontend calls {@code POST /api/v3/ai/token}
 *   <li>This controller extracts user info from LMS JWT
 *   <li>Calls {@link WiiiTokenExchangeAdapter} to exchange for AI JWT
 *   <li>Returns AI token pair to frontend
 *   <li>Frontend uses AI JWT for direct streaming
 * </ol>
 */
@RestController
@RequestMapping("/api/v3/ai")
@PreAuthorize("isAuthenticated()")
@Tag(name = "AI Assistant", description = "AI-powered chat and assistance APIs")
@SecurityRequirement(name = "bearerAuth")
public class AiTokenControllerV3 {

    private static final Logger log = LoggerFactory.getLogger(AiTokenControllerV3.class);

    private final WiiiTokenExchangeAdapter tokenExchangeAdapter;

    public AiTokenControllerV3(WiiiTokenExchangeAdapter tokenExchangeAdapter) {
        this.tokenExchangeAdapter = tokenExchangeAdapter;
    }

    /**
     * Exchange LMS session for an AI service JWT token pair.
     *
     * <p>Requires an authenticated LMS user (LMS JWT in Authorization header).
     * Returns an AI-specific JWT that the frontend uses for direct streaming.
     */
    @PostMapping("/token")
    @Operation(summary = "Exchange LMS JWT for AI service token")
    public ApiResponse<?> exchangeAiToken(@AuthenticationPrincipal UserJpaEntity user) {
        log.info("AI token exchange requested: userId={}, role={}",
                user.getId(), user.getRole());

        var tokenPair = tokenExchangeAdapter.exchangeToken(
                user.getId().toString(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole().name()
        );

        if (tokenPair.isEmpty()) {
            return ApiResponse.error("AI_TOKEN_FAILED",
                    "Không thể kết nối với AI service. Vui lòng thử lại sau.");
        }

        var pair = tokenPair.get();
        var data = new java.util.HashMap<String, Object>();
        data.put("access_token", pair.accessToken());
        data.put("refresh_token", pair.refreshToken());
        data.put("token_type", "Bearer");
        if (pair.organizationId() != null) {
            data.put("organization_id", pair.organizationId());
        }
        return ApiResponse.success(data, "Kết nối AI thành công");
    }
}
