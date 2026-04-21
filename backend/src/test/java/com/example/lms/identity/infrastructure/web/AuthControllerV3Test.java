package com.example.lms.identity.infrastructure.web;

import com.example.lms.identity.application.usecase.AuthenticateUserUseCaseV2;
import com.example.lms.identity.application.usecase.AuthenticateWithGoogleUseCase;
import com.example.lms.identity.application.usecase.ChangePasswordUseCaseV2;
import com.example.lms.identity.application.usecase.DiscoverAuthOptionsUseCase;
import com.example.lms.identity.application.usecase.GetCurrentUserUseCaseV2;
import com.example.lms.identity.application.usecase.RefreshTokenUseCaseV2;
import com.example.lms.identity.application.usecase.RegisterUserUseCaseV2;
import com.example.lms.identity.application.usecase.RequestPasswordResetUseCase;
import com.example.lms.identity.application.usecase.ResetPasswordUseCase;
import com.example.lms.identity.application.usecase.SendVerificationEmailUseCase;
import com.example.lms.identity.application.usecase.UpdateProfileUseCaseV2;
import com.example.lms.identity.application.usecase.VerifyEmailUseCase;
import com.example.lms.shared.application.port.EmailServicePort;
import com.example.lms.shared.infrastructure.web.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthControllerV3 Tests")
class AuthControllerV3Test {

    @Mock private RegisterUserUseCaseV2 registerUseCase;
    @Mock private AuthenticateUserUseCaseV2 authenticateUseCase;
    @Mock private DiscoverAuthOptionsUseCase discoverAuthOptionsUseCase;
    @Mock private GetCurrentUserUseCaseV2 getCurrentUserUseCase;
    @Mock private UpdateProfileUseCaseV2 updateProfileUseCase;
    @Mock private ChangePasswordUseCaseV2 changePasswordUseCase;
    @Mock private RefreshTokenUseCaseV2 refreshTokenUseCase;
    @Mock private AuthenticateWithGoogleUseCase authenticateWithGoogleUseCase;
    @Mock private RequestPasswordResetUseCase requestPasswordResetUseCase;
    @Mock private ResetPasswordUseCase resetPasswordUseCase;
    @Mock private SendVerificationEmailUseCase sendVerificationEmailUseCase;
    @Mock private VerifyEmailUseCase verifyEmailUseCase;
    @Mock private EmailServicePort emailService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AuthControllerV3 controller = new AuthControllerV3(
                registerUseCase,
                authenticateUseCase,
                discoverAuthOptionsUseCase,
                getCurrentUserUseCase,
                updateProfileUseCase,
                changePasswordUseCase,
                refreshTokenUseCase,
                authenticateWithGoogleUseCase,
                requestPasswordResetUseCase,
                resetPasswordUseCase,
                sendVerificationEmailUseCase,
                verifyEmailUseCase,
                emailService,
                new com.example.lms.identity.infrastructure.security.GoogleOAuthProperties()
        );

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("login returns 400 with INVALID_JSON when request body is malformed")
    void loginReturnsBadRequestForMalformedJson() throws Exception {
        mockMvc.perform(post("/api/v3/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ email: \"student@maritime.edu\", \"password\": \"student123\" }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("JSON request khong hop le"))
                .andExpect(jsonPath("$.error.code").value("INVALID_JSON"));

        verifyNoInteractions(authenticateUseCase);
    }

    @Test
    @DisplayName("google config returns disabled when Google auth is not configured")
    void googleConfigReturnsDisabledWhenNotConfigured() throws Exception {
        mockMvc.perform(get("/api/v3/auth/google/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.enabled").value(false))
                .andExpect(jsonPath("$.data.clientId").doesNotExist());
    }

    @Test
    @DisplayName("lookup returns the next auth step for an existing password account")
    void lookupReturnsNextStep() throws Exception {
        given(discoverAuthOptionsUseCase.execute(new com.example.lms.identity.application.dto.DiscoverAuthOptionsCommand("teacher@maritime.edu")))
                .willReturn(new com.example.lms.identity.application.dto.DiscoverAuthOptionsResponse(
                        "teacher@maritime.edu",
                        "Teacher Maritime",
                        true,
                        true,
                        false,
                        "PASSWORD"
                ));

        mockMvc.perform(post("/api/v3/auth/lookup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"teacher@maritime.edu"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("teacher@maritime.edu"))
                .andExpect(jsonPath("$.data.nextStep").value("PASSWORD"))
                .andExpect(jsonPath("$.data.passwordLoginAvailable").value(true))
                .andExpect(jsonPath("$.data.googleSignInAvailable").value(false));
    }
}
