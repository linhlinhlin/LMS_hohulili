package com.example.lms.config;

import com.example.lms.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;

import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        // Quiz management (TEACHER can create/edit, STUDENT can view/attempt) - High priority
                        // Quiz management - DEBUG: permitAll to test connectivity
                        .requestMatchers("/api/v1/quizzes/**", "/api/v2/quizzes/**").permitAll()

                        // Public endpoints
                        .requestMatchers(
                                "/api/auth/**",
                                "/api/v1/auth/**", // Fixed: Add v1 auth endpoints
                                "/api/v1/health/**",
                                "/api/health/**",
                                "/api/v1/ai/health", // AI health check public
                                "/api/v1/courses", // Public course list (approved courses only)
                                "/api/v1/dev/**", // DEV endpoints (REMOVE IN PRODUCTION!)
                                // Swagger/OpenAPI endpoints
                                "/v3/api-docs/**",
                                "/v3/api-docs",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/swagger-resources/**",
                                "/webjars/**",
                                "/actuator/**"
                        ).permitAll()
            // Public read-only course endpoints (detail) - allow GET for course detail
            .requestMatchers(HttpMethod.GET, "/api/v1/courses/*").permitAll()
                        
                        // Admin endpoints
                        .requestMatchers("/api/admin/**", "/api/v1/admin/**").hasRole("ADMIN")
                        
                        // User management endpoints (ADMIN only)
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/instructors").hasAnyRole("ADMIN", "TEACHER")
                        .requestMatchers("/api/v1/users/**").hasRole("ADMIN")
                        
                        // Teacher endpoints
                        .requestMatchers("/api/teacher/**", "/api/v1/teacher/**").hasAnyRole("ADMIN", "TEACHER")
                        
                        // Student endpoints
                        // .requestMatchers("/api/student/**", "/api/v1/student/**").hasAnyRole("ADMIN", "TEACHER", "STUDENT")
                        .requestMatchers("/api/v1/student/**").hasRole("STUDENT")
                        .requestMatchers("/api/student/**").hasRole("STUDENT")

                        // Specific student progress endpoints - ensure STUDENT role access
                        //.requestMatchers(HttpMethod.GET, "/api/v1/student/progress/courses/*/completed-ids").hasAnyRole("ADMIN", "TEACHER", "STUDENT")
                        
                        // Assignment management
                        .requestMatchers("/api/v1/assignments/**").hasAnyRole("ADMIN", "TEACHER", "STUDENT")
                        
                        // File streaming: allow GET to serve uploaded files (video/audio/images)
                        .requestMatchers(HttpMethod.GET, "/api/v1/files/**").permitAll()
                        // Other file operations (upload/delete) require auth
                        .requestMatchers("/api/v1/files/**").hasAnyRole("ADMIN", "TEACHER", "STUDENT")
                        
                        // Document upload and parsing (TEACHER/ADMIN only)
                        .requestMatchers("/api/v1/documents/**").hasAnyRole("ADMIN", "TEACHER")
                        
                        // Question management (TEACHER/ADMIN only)
                        .requestMatchers("/api/v1/questions/**").hasAnyRole("ADMIN", "TEACHER")
                        
                        // Messaging endpoints (TEACHER and STUDENT can message each other)
                        .requestMatchers("/api/v1/messages/**").hasAnyRole("ADMIN", "TEACHER", "STUDENT")
                        
                        // AI Chat endpoints
                        // Public: health check, ping, và test streaming
                        .requestMatchers("/api/v1/ai/health", "/api/v1/ai/ping", "/api/v1/ai/chat/stream/test").permitAll()
                        // Admin only: Knowledge management và History management
                        .requestMatchers("/api/v1/ai/admin/**").hasRole("ADMIN")
                        // Protected: chat và session management (yêu cầu authentication)
                        .requestMatchers("/api/v1/ai/**").hasAnyRole("ADMIN", "TEACHER", "STUDENT")
                        
                        // Section and lesson management
                        // Explicitly allow OPTIONS for CORS preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        
                        // Allow POST/PUT/DELETE operations for Admin/Teacher (MUST come BEFORE GET rule)
                        .requestMatchers(HttpMethod.POST, "/api/v1/sections/**", "/api/v1/lessons/**").hasAnyRole("ADMIN", "TEACHER")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/sections/**", "/api/v1/lessons/**").hasAnyRole("ADMIN", "TEACHER")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/sections/**", "/api/v1/lessons/**").hasAnyRole("ADMIN", "TEACHER")
                        
                        // Allow GET for Everyone (including Students)
                        .requestMatchers(HttpMethod.GET, "/api/v1/sections/**", "/api/v1/lessons/**").hasAnyRole("ADMIN", "TEACHER", "STUDENT")
                        
                        // Course Authoring endpoints (TEACHER/ADMIN only)
                        .requestMatchers("/api/v1/authoring/**").hasAnyRole("ADMIN", "TEACHER")
                        
                        // Course management - specific endpoints first
                        .requestMatchers("/api/v1/courses/create", "/api/v1/courses/*/edit").hasAnyRole("ADMIN", "TEACHER")
                        .requestMatchers("/api/v1/courses/my-courses").hasAnyRole("ADMIN", "TEACHER")
                        .requestMatchers("/api/v1/courses/enrolled-courses").hasAnyRole("ADMIN", "TEACHER", "STUDENT")
                        .requestMatchers("/api/v1/courses/**").hasAnyRole("ADMIN", "TEACHER", "STUDENT")
                        
                        // All other requests need authentication
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userService);
        authProvider.setPasswordEncoder(passwordEncoder);
        authProvider.setHideUserNotFoundExceptions(false); // Show actual authentication errors
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*")); // Allow all origins
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        configuration.setExposedHeaders(List.of("Authorization", "Content-Disposition", "Content-Type", "Content-Length"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L); // Cache preflight response for 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
    
    /**
     * Completely bypass security for Swagger/OpenAPI endpoints
     * This ensures these endpoints are not processed by the security filter chain at all
     */
    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring().requestMatchers(
            "/v3/api-docs/**",
            "/v3/api-docs",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/swagger-resources/**",
            "/webjars/**"
        );
    }
}