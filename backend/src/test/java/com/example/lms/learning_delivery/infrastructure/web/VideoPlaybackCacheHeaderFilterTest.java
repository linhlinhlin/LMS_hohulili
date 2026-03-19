package com.example.lms.learning_delivery.infrastructure.web;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class VideoPlaybackCacheHeaderFilterTest {

    private final VideoPlaybackCacheHeaderFilter filter = new VideoPlaybackCacheHeaderFilter();

    @Test
    @DisplayName("manifest responses get short-lived private cache headers")
    void manifestResponsesGetPrivateCacheHeaders() throws Exception {
        ReflectionTestUtils.setField(filter, "manifestCacheSeconds", 60L);
        ReflectionTestUtils.setField(filter, "objectRedirectCacheSeconds", 30L);

        MockHttpServletRequest request = new MockHttpServletRequest("GET",
                "/api/v3/video-assets/asset-id/adaptive/token/hls/master.m3u8");
        MockHttpServletResponse response = new MockHttpServletResponse();

        FilterChain chain = (req, res) -> ((MockHttpServletResponse) res).setStatus(200);
        filter.doFilter(request, response, chain);

        assertThat(response.getHeader("Cache-Control")).isEqualTo("private, max-age=60");
        assertThat(response.getHeader("Pragma")).isEmpty();
    }

    @Test
    @DisplayName("object redirect responses get shorter cache headers")
    void objectRedirectResponsesGetShorterCacheHeaders() throws Exception {
        ReflectionTestUtils.setField(filter, "manifestCacheSeconds", 60L);
        ReflectionTestUtils.setField(filter, "objectRedirectCacheSeconds", 30L);

        MockHttpServletRequest request = new MockHttpServletRequest("GET",
                "/api/v3/video-assets/asset-id/adaptive/token/object");
        MockHttpServletResponse response = new MockHttpServletResponse();

        FilterChain chain = (req, res) -> ((MockHttpServletResponse) res).setStatus(302);
        filter.doFilter(request, response, chain);

        assertThat(response.getHeader("Cache-Control")).isEqualTo("private, max-age=30");
    }
}
