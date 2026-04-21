package com.example.lms.identity.infrastructure.web;

import com.example.lms.identity.application.dto.AuthResponse;
import com.example.lms.identity.application.dto.AuthenticateWithGoogleCommand;
import com.example.lms.identity.application.usecase.AuthenticateWithGoogleUseCase;
import com.example.lms.identity.infrastructure.security.GoogleOAuthProperties;
import com.example.lms.identity.infrastructure.security.GoogleOAuthStateStore;
import com.example.lms.identity.infrastructure.security.GoogleOAuthTokenClient;
import com.example.lms.shared.exception.DomainException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;

/**
 * Server-side Google OAuth redirect flow (Wiii-style).
 *
 * <p>Why this exists alongside {@code POST /api/v3/auth/google}:
 * <ul>
 *   <li>The ID-token flow runs entirely client-side via Google Identity Services. It fails
 *       opaquely when third-party cookies / FedCM / popups are blocked (corporate proxies,
 *       Brave/Arc defaults, ad-blockers, restricted networks).</li>
 *   <li>The redirect flow takes the user away to {@code accounts.google.com} via a normal
 *       browser navigation — none of those failure modes apply, and the UX is identical to
 *       Wiii / Anthropic / GitHub Google login.</li>
 * </ul>
 *
 * <p>Flow:
 * <ol>
 *   <li>FE navigates {@code window.location} to {@code /api/v3/auth/google/authorize}</li>
 *   <li>BE issues state + PKCE, redirects to Google's authorize endpoint</li>
 *   <li>User signs in on Google, Google redirects back to {@code /api/v3/auth/google/callback}</li>
 *   <li>BE consumes state, exchanges code for tokens, verifies ID token via the existing
 *       {@link AuthenticateWithGoogleUseCase} (so user provisioning + JWT issuance are
 *       100% identical to the ID-token flow — no second code path)</li>
 *   <li>BE redirects browser to the FE callback page with the LMS JWT in the URL fragment
 *       ({@code #...}) — fragments never hit access logs or Referer headers</li>
 * </ol>
 */
@Slf4j
@RestController
@RequestMapping("/api/v3/auth/google")
@RequiredArgsConstructor
@Tag(name = "Authentication v3", description = "Authentication APIs")
public class GoogleOAuthRedirectController {

    private static final String GOOGLE_AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

    private final GoogleOAuthProperties properties;
    private final GoogleOAuthStateStore stateStore;
    private final GoogleOAuthTokenClient tokenClient;
    private final AuthenticateWithGoogleUseCase authenticateWithGoogleUseCase;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Value("${app.auth.google.web-client-id:}")
    private String webClientId;

    /**
     * Step 1 — issue state + PKCE and redirect to Google's authorize endpoint.
     *
     * @param invite optional invite code, propagated through state and applied during user provisioning
     * @param returnUrl optional FE-relative path (e.g. {@code /student/courses/abc}) the FE should
     *                  navigate to after consuming the JWT. Validation happens on the FE side
     *                  (it must be safe-internal); we just round-trip the value.
     */
    @GetMapping("/authorize")
    @Operation(summary = "Khoi tao luong dang nhap Google (server-side redirect)")
    public ResponseEntity<Void> authorize(
            @RequestParam(name = "invite", required = false) String invite,
            @RequestParam(name = "returnUrl", required = false) String returnUrl
    ) {
        if (!properties.isFullyConfigured() || webClientId.isBlank()) {
            log.warn("Google OAuth redirect flow disabled or missing config — refusing /authorize");
            return ResponseEntity.status(503).build();
        }

        GoogleOAuthStateStore.Issued issued = stateStore.issue(invite, returnUrl);

        String url = GOOGLE_AUTHORIZE_ENDPOINT
                + "?client_id=" + enc(webClientId)
                + "&redirect_uri=" + enc(properties.getRedirectUri())
                + "&response_type=code"
                + "&scope=" + enc("openid email profile")
                + "&state=" + enc(issued.state())
                + "&code_challenge=" + enc(issued.codeChallenge())
                + "&code_challenge_method=S256"
                + "&access_type=online"
                // Forces the account chooser even if the user has only one Google account signed
                // in — matches Wiii's UX (always show the picker so the user can switch).
                + "&prompt=select_account";

        return ResponseEntity.status(302).location(URI.create(url)).build();
    }

    /**
     * Step 2 — Google redirects back here with {@code code} + {@code state} (or {@code error}).
     */
    @GetMapping("/callback")
    @Operation(summary = "Callback nhan ma Google va tra ve LMS JWT (qua URL fragment)")
    public void callback(
            @RequestParam(name = "code", required = false) String code,
            @RequestParam(name = "state", required = false) String state,
            @RequestParam(name = "error", required = false) String error,
            HttpServletResponse response
    ) throws java.io.IOException {

        if (!properties.isFullyConfigured()) {
            sendError(response, "GOOGLE_OAUTH_DISABLED", "Tính năng đăng nhập qua redirect chưa được bật", null);
            return;
        }

        if (error != null && !error.isBlank()) {
            // User denied consent / closed Google tab. Fragment lets the FE show a friendly toast.
            log.info("Google OAuth callback returned error={}", error);
            sendError(response, "GOOGLE_OAUTH_DENIED", "Bạn đã hủy đăng nhập Google", null);
            return;
        }

        Optional<GoogleOAuthStateStore.Entry> entryOpt = stateStore.consume(state);
        if (entryOpt.isEmpty()) {
            // Either CSRF replay attempt or user took >10 minutes on Google's screen.
            log.warn("Google OAuth callback with invalid/expired state");
            sendError(response, "GOOGLE_OAUTH_STATE_INVALID",
                    "Phiên đăng nhập Google đã hết hạn. Vui lòng thử lại.", null);
            return;
        }
        GoogleOAuthStateStore.Entry entry = entryOpt.get();

        if (code == null || code.isBlank()) {
            sendError(response, "GOOGLE_OAUTH_NO_CODE",
                    "Google không trả về mã ủy quyền. Vui lòng thử lại.", entry.returnUrl());
            return;
        }

        try {
            GoogleOAuthTokenClient.GoogleTokenResponse tokens = tokenClient.exchange(
                    code, entry.codeVerifier(), properties.getClientSecret(), properties.getRedirectUri());

            // Reuse the existing use case — user provisioning, org assignment, JWT issuance,
            // and the link-required guard all live there and stay consistent across both flows.
            AuthResponse authResponse = authenticateWithGoogleUseCase.execute(
                    new AuthenticateWithGoogleCommand(tokens.idToken(), entry.inviteCode()));

            sendSuccess(response, authResponse, entry.returnUrl());
        } catch (DomainException e) {
            log.info("Google OAuth callback rejected: {} {}", e.getErrorCode(), e.getMessage());
            sendError(response, e.getErrorCode(), e.getMessage(), entry.returnUrl());
        } catch (Exception e) {
            log.error("Google OAuth callback failed unexpectedly", e);
            sendError(response, "GOOGLE_OAUTH_ERROR",
                    "Không thể hoàn tất đăng nhập Google. Vui lòng thử lại.", entry.returnUrl());
        }
    }

    /**
     * Encode AuthResponse into the URL fragment of the FE callback. Fragment (after {@code #})
     * is never sent to the server, never logged, never set in Referer — so the JWT stays in
     * the browser even if the FE callback URL is captured by analytics.
     */
    private void sendSuccess(HttpServletResponse response, AuthResponse auth, String returnUrl) throws java.io.IOException {
        String userJson;
        try {
            userJson = objectMapper.writeValueAsString(auth.user());
        } catch (JsonProcessingException e) {
            // Practically impossible — UserResponse is a POJO Jackson handles trivially.
            log.error("Failed to serialize user for OAuth fragment", e);
            sendError(response, "GOOGLE_OAUTH_SERIALIZE_FAILED", "Loi noi bo, vui long thu lai", returnUrl);
            return;
        }

        String fragment = "token=" + enc(auth.accessToken())
                + "&refresh=" + enc(auth.refreshToken())
                + "&user=" + enc(b64UrlEncode(userJson));

        if (returnUrl != null && !returnUrl.isBlank()) {
            fragment += "&returnUrl=" + enc(returnUrl);
        }

        response.sendRedirect(properties.getFrontendCallbackUri() + "#" + fragment);
    }

    private void sendError(HttpServletResponse response, String code, String message, String returnUrl) throws java.io.IOException {
        String fragment = "error=" + enc(code) + "&message=" + enc(message);
        if (returnUrl != null && !returnUrl.isBlank()) {
            fragment += "&returnUrl=" + enc(returnUrl);
        }

        if (properties.getFrontendCallbackUri().isBlank()) {
            // No callback URL configured — fall back to inline JSON. Should never happen in
            // production because isFullyConfigured() gates the controller upstream.
            response.setStatus(400);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\":\"" + code + "\",\"message\":\"" + message + "\"}");
            return;
        }

        response.sendRedirect(properties.getFrontendCallbackUri() + "#" + fragment);
    }

    private static String enc(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private static String b64UrlEncode(String value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }
}
