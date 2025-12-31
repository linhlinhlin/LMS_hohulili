package com.example.lms.config;

import com.example.lms.service.JwtService;
import com.example.lms.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    @Lazy
    private final UserService userService;

    /**
     * Bypass JWT filter completely for public endpoints (Architect Directive - Step 2)
     * This prevents any JWT processing errors from causing 403
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        // Always skip OPTIONS requests (CORS preflight)
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        
        String path = request.getServletPath();
        // Fallback to requestURI if servletPath is empty
        if (path == null || path.isEmpty()) {
            path = request.getRequestURI();
        }
        return path.startsWith("/api/v1/files/upload/editor") ||
               path.startsWith("/api/v1/files/view") ||
               path.startsWith("/api/v1/files/stream") ||
               path.startsWith("/api/v1/auth") ||
               path.startsWith("/api/auth") ||
               path.startsWith("/v3/api-docs") ||
               path.startsWith("/swagger-ui");
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        
        // Aggressive logging to confirm filter execution
        System.out.println("JWT FILTER HIT: " + request.getRequestURI());

        // Skip JWT filter for public endpoints
        String path = request.getRequestURI();
        if (shouldSkipFilter(path)) {
            System.out.println("JWT FILTER SKIPPING: " + path);
            filterChain.doFilter(request, response);
            return;
        }
        
        final String authHeader = request.getHeader("Authorization");
        String jwt = null;
        final String username;

        // Check Authorization header
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7);
        } 
        // fallback to query parameter (SOTA for <img> tags)
        else if (request.getParameter("token") != null) {
            jwt = request.getParameter("token");
        }
        else if (request.getParameter("access_token") != null) {
            jwt = request.getParameter("access_token");
        }

        if (jwt == null) {
            // System.out.println("JWT DEBUG: No Bearer token found in request to " + request.getRequestURI());
            filterChain.doFilter(request, response);
            return;
        }

        // Extract JWT token (already done above)
        // jwt = authHeader.substring(7); // REMOVED
        
        // Enhanced JWT debugging for question endpoints
        if (request.getRequestURI().contains("/questions")) {
            System.out.println("=== JWT DEBUG FOR QUESTIONS ===");
            System.out.println("Request URI: " + request.getRequestURI());
            System.out.println("JWT Token present: " + (jwt != null && !jwt.isEmpty()));
        }
        System.out.println("JWT Token: " + jwt.substring(0, Math.min(20, jwt.length())) + "...");
        
        try {
            username = jwtService.extractUsername(jwt);
            if (request.getRequestURI().contains("/questions")) {
                System.out.println("Extracted username: " + username);
            }

            // If username is extracted and no authentication is set in SecurityContext
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userService.loadUserByUsername(username);
                
                if (request.getRequestURI().contains("/questions")) {
                    System.out.println("Loaded UserDetails: " + userDetails.getUsername());
                    System.out.println("User Authorities: " + userDetails.getAuthorities());
                }
                
                // Validate token
                if (jwtService.isTokenValid(jwt, userDetails)) {
                    if (request.getRequestURI().contains("/questions")) {
                        System.out.println("✅ JWT Token is valid");
                    }
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    if (request.getRequestURI().contains("/questions")) {
                        System.out.println("✅ Authentication set in SecurityContext");
                    }
                } else {
                    if (request.getRequestURI().contains("/questions")) {
                        System.out.println("❌ JWT Token is INVALID");
                    }
                }
            }
            if (request.getRequestURI().contains("/questions") || request.getRequestURI().contains("/api/v2/quizzes") || request.getRequestURI().contains("/api/v1/quizzes")) {
                System.out.println("=== END JWT DEBUG ===");
            }
        } catch (Exception e) {
            // Log the error but don't block the request
            logger.error("Cannot set user authentication: {}", e);
        }

        filterChain.doFilter(request, response);
    }
    
    /**
     * Check if the request path should skip JWT authentication
     */
    private boolean shouldSkipFilter(String path) {
        return path.startsWith("/v3/api-docs") ||
               path.startsWith("/swagger-ui") ||
               path.startsWith("/swagger-resources") ||
               path.startsWith("/webjars") ||
               path.startsWith("/actuator") ||
               path.startsWith("/api/v1/auth") ||
               path.startsWith("/api/auth") ||
               path.startsWith("/api/v1/auth") ||
               path.equals("/api/v1/ai/health") ||
               path.equals("/api/v1/ai/health") ||
               path.equals("/api/v1/ai/ping") ||
               path.startsWith("/api/v1/files/upload/editor"); // Skip EditorJS uploads
    }
}
