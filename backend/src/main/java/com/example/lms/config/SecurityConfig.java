package com.example.lms.config;

import com.example.lms.identity.infrastructure.security.UserDetailsServiceImpl;
import com.example.lms.learning_delivery.infrastructure.web.VideoPlaybackCacheHeaderFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.HeaderWriterFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.DispatcherType;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final UserDetailsServiceImpl userDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final VideoPlaybackCacheHeaderFilter videoPlaybackCacheHeaderFilter;

    @Value("${app.cors.allowed-origins:http://localhost:4200,http://127.0.0.1:4200,http://localhost:4300,http://127.0.0.1:4300,http://localhost:61361,http://127.0.0.1:61361}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(org.springframework.security.config.Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .headers(headers -> headers
                .frameOptions(frame -> frame.sameOrigin())
                .contentTypeOptions(content -> {})
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                )
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'none'; frame-ancestors 'self' http://localhost:4200 https://holilihu.online; frame-src https://wiii.holilihu.online https://www.youtube.com")
                )
            )
            .authorizeHttpRequests(auth -> auth
                // Sprint 220: Permit async dispatch for SSE streaming (SecurityContext lost in virtual threads)
                .dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll()
                .requestMatchers(
                    // API Documentation
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    // Auth endpoints (V3 only)
                    "/api/v3/auth/**",
                    // AI health endpoints
                    "/api/v3/ai/health",
                    "/api/v3/ai/ping",
                    // Public course endpoints (CourseQueryControllerV3)
                    "/api/v3/courses",
                    "/api/v3/courses/*",
                    "/api/v3/courses/*/content",
                    "/api/v3/courses/lessons/*",
                    "/api/v3/courses/chapters/*",
                    // Categories (legacy + new hierarchical + tags)
                    "/api/v3/categories",
                    "/api/v3/course-categories",
                    "/api/v3/course-categories/**",
                    "/api/v3/course-tags",
                    // Package endpoints now require authentication (P0-12)
                    // Uploaded files (static resources)
                    "/uploads/**",
                    // Certificate verification (public)
                    "/api/v3/student/certificates/*/verify",
                    "/api/v3/certificates/verify/*",
                    // Course reviews (public read)
                    "/api/v3/courses/*/reviews",
                    "/api/v3/courses/*/reviews/summary",
                    // Actuator health check (Docker HEALTHCHECK)
                    "/actuator/health",
                    // Question bank search now requires authentication (P0-12)
                    // Wiii AI integration (service-to-service, auth via WiiiServiceAuthFilter)
                    "/api/v3/integration/**",
                    // VNPay callbacks (server-to-server IPN + browser return)
                    "/api/v3/payments/vnpay-ipn",
                    "/api/v3/payments/vnpay-return",
                    // SePay webhook (server-to-server, authenticated via Apikey header — NOT JWT)
                    "/api/v3/payments/sepay/webhook",
                    // Public invite validation (rate-limited)
                    "/api/v3/invites/validate",
                    "/api/v3/invites/validate-token",
                    // Tokenized adaptive video playback validates access via playback token, not JWT auth
                    "/api/v3/video-assets/*/adaptive/**",
                    // WebSocket handshake (JWT validated inside STOMP interceptor)
                    "/ws/**"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider())
            .addFilterAfter(videoPlaybackCacheHeaderFilter, HeaderWriterFilter.class)
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder);
        authProvider.setHideUserNotFoundExceptions(true);
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = List.of(allowedOrigins.split(","));
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Range", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        configuration.setExposedHeaders(List.of("Authorization", "Content-Disposition", "Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
