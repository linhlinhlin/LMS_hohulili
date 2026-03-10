package com.example.lms.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RateLimitingFilterTest {

    @Test
    void shouldRateLimitAnonymousPublicCourseContentRequests() throws Exception {
        RateLimitingFilter filter = new RateLimitingFilter();

        for (int i = 0; i < 120; i++) {
            MockHttpServletResponse response = invoke(filter, "/api/v3/courses/123/content", "GET", null);
            assertEquals(200, response.getStatus());
        }

        MockHttpServletResponse blocked = invoke(filter, "/api/v3/courses/123/content", "GET", null);
        assertEquals(429, blocked.getStatus());
        assertTrue(blocked.getContentAsString().contains("RATE_LIMITED"));
    }

    @Test
    void shouldAllowAuthenticatedAuthoringReadsToUseHigherPublicBucket() throws Exception {
        RateLimitingFilter filter = new RateLimitingFilter();

        for (int i = 0; i < 121; i++) {
            MockHttpServletResponse response = invoke(
                    filter,
                    "/api/v3/courses/123/content",
                    "GET",
                    "Bearer teacher-token");
            assertEquals(200, response.getStatus());
        }
    }

    @Test
    void shouldNotTreatNestedAuthoringEndpointsAsPublic() throws Exception {
        RateLimitingFilter filter = new RateLimitingFilter();

        for (int i = 0; i < 150; i++) {
            MockHttpServletResponse response = invoke(filter, "/api/v3/courses/lessons/123", "GET", null);
            assertEquals(200, response.getStatus());
            assertNull(response.getHeader("X-RateLimit-Limit"));
        }
    }

    private MockHttpServletResponse invoke(
            RateLimitingFilter filter,
            String path,
            String method,
            String authorizationHeader
    ) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setRemoteAddr("127.0.0.1");
        if (authorizationHeader != null) {
            request.addHeader("Authorization", authorizationHeader);
        }

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }
}
