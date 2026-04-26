package com.example.lms.config;

import com.example.lms.identity.infrastructure.security.JwtService;
import com.example.lms.identity.infrastructure.security.UserDetailsServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("JwtAuthenticationFilter Tests")
class JwtAuthenticationFilterTest {

    private static final String INVALID_TOKEN_MESSAGE =
            "Phi\u00ean \u0111\u0103ng nh\u1eadp kh\u00f4ng h\u1ee3p l\u1ec7 ho\u1eb7c \u0111\u00e3 h\u1ebft h\u1ea1n";

    @Mock
    private JwtService jwtService;

    @Mock
    private UserDetailsServiceImpl userDetailsService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("invalid bearer token on protected route returns 401 and stops the chain")
    void invalidBearerOnProtectedRouteReturns401() throws Exception {
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
                jwtService,
                userDetailsService,
                new PublicApiEndpointMatcher(),
                testObjectMapper()
        );

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v3/student/courses/enrolled");
        request.addHeader("Authorization", "Bearer invalid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean chainCalled = new AtomicBoolean(false);
        FilterChain chain = (req, res) -> chainCalled.set(true);

        given(jwtService.extractUsername("invalid-token"))
                .willThrow(new SignatureException("JWT signature does not match locally computed signature."));

        filter.doFilter(request, response, chain);

        assertThat(chainCalled.get()).isFalse();
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("INVALID_TOKEN");
        assertThat(response.getContentAsString()).contains(INVALID_TOKEN_MESSAGE);
    }

    @Test
    @DisplayName("invalid bearer token on public route falls back to anonymous access")
    void invalidBearerOnPublicRouteFallsBackToAnonymous() throws Exception {
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
                jwtService,
                userDetailsService,
                new PublicApiEndpointMatcher(),
                testObjectMapper()
        );

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v3/courses");
        request.addHeader("Authorization", "Bearer invalid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean chainCalled = new AtomicBoolean(false);
        FilterChain chain = (req, res) -> {
            chainCalled.set(true);
            ((MockHttpServletResponse) res).setStatus(200);
        };

        given(jwtService.extractUsername("invalid-token"))
                .willThrow(new SignatureException("JWT signature does not match locally computed signature."));

        filter.doFilter(request, response, chain);

        assertThat(chainCalled.get()).isTrue();
        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("default organization endpoint is public for registration bootstrap")
    void defaultOrganizationEndpointIsPublic() throws Exception {
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
                jwtService,
                userDetailsService,
                new PublicApiEndpointMatcher(),
                testObjectMapper()
        );

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v3/organizations/default");
        request.addHeader("Authorization", "Bearer invalid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean chainCalled = new AtomicBoolean(false);
        FilterChain chain = (req, res) -> {
            chainCalled.set(true);
            ((MockHttpServletResponse) res).setStatus(200);
        };

        given(jwtService.extractUsername("invalid-token"))
                .willThrow(new SignatureException("JWT signature does not match locally computed signature."));

        filter.doFilter(request, response, chain);

        assertThat(chainCalled.get()).isTrue();
        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("valid bearer token still authenticates optional-auth public routes")
    void validBearerStillAuthenticatesPublicRoute() throws Exception {
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
                jwtService,
                userDetailsService,
                new PublicApiEndpointMatcher(),
                testObjectMapper()
        );

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v3/courses/123/content");
        request.addHeader("Authorization", "Bearer valid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<Authentication> authenticationRef = new AtomicReference<>();
        FilterChain chain = (req, res) -> {
            authenticationRef.set(SecurityContextHolder.getContext().getAuthentication());
            ((MockHttpServletResponse) res).setStatus(200);
        };

        UserDetails userDetails = User.withUsername("student@maritime.edu")
                .password("ignored")
                .authorities("ROLE_STUDENT")
                .build();

        given(jwtService.extractUsername("valid-token")).willReturn("student@maritime.edu");
        given(userDetailsService.loadUserByUsername("student@maritime.edu")).willReturn(userDetails);
        given(jwtService.isTokenValid("valid-token", userDetails)).willReturn(true);

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(authenticationRef.get()).isNotNull();
        assertThat(authenticationRef.get().getName()).isEqualTo("student@maritime.edu");
    }

    private ObjectMapper testObjectMapper() {
        return JsonMapper.builder()
                .addModule(new JavaTimeModule())
                .build();
    }
}
