package com.example.lms.config;

import com.example.lms.identity.infrastructure.security.JwtService;
import com.example.lms.identity.infrastructure.security.UserDetailsServiceImpl;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String INVALID_TOKEN_MESSAGE =
            "Phi\u00ean \u0111\u0103ng nh\u1eadp kh\u00f4ng h\u1ee3p l\u1ec7 ho\u1eb7c \u0111\u00e3 h\u1ebft h\u1ea1n. Vui l\u00f2ng \u0111\u0103ng nh\u1eadp l\u1ea1i.";

    private final JwtService jwtService;
    @Lazy
    private final UserDetailsServiceImpl userDetailsService;
    private final PublicApiEndpointMatcher publicApiEndpointMatcher;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        boolean publicEndpoint = publicApiEndpointMatcher.matches(request);

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String jwt = authHeader.substring(7);

        try {
            String username = jwtService.extractUsername(jwt);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                if (!userDetails.isEnabled() || !userDetails.isAccountNonLocked()) {
                    if (handleAuthenticationFailure(
                            response,
                            publicEndpoint,
                            path,
                            "User account disabled or locked: " + username
                    )) {
                        return;
                    }
                } else if (!jwtService.isAccessToken(jwt) || !jwtService.isTokenValid(jwt, userDetails)) {
                    if (handleAuthenticationFailure(
                            response,
                            publicEndpoint,
                            path,
                            "JWT token failed access-token validation checks"
                    )) {
                        return;
                    }
                } else {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (io.jsonwebtoken.JwtException | UsernameNotFoundException e) {
            if (handleAuthenticationFailure(response, publicEndpoint, path, e.getMessage())) {
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean handleAuthenticationFailure(
            HttpServletResponse response,
            boolean publicEndpoint,
            String path,
            String reason
    ) throws IOException {
        SecurityContextHolder.clearContext();

        if (publicEndpoint) {
            log.debug("Ignoring invalid bearer token on public request {}: {}", path, reason);
            return false;
        }

        log.warn("Rejecting invalid bearer token on protected request {}: {}", path, reason);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(
                response.getWriter(),
                ApiResponse.error("INVALID_TOKEN", INVALID_TOKEN_MESSAGE)
        );
        return true;
    }
}
