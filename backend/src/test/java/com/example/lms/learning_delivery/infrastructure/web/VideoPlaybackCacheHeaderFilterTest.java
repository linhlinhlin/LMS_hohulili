package com.example.lms.learning_delivery.infrastructure.web;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class VideoPlaybackCacheHeaderFilterTest {

    private final VideoPlaybackCacheHeaderFilter filter = new VideoPlaybackCacheHeaderFilter();

    @Test
    @DisplayName("manifest responses get short-lived private cache headers")
    void manifestResponsesGetPrivateCacheHeaders() throws Exception {
        configureDefaults();

        MockHttpServletRequest request = new MockHttpServletRequest("GET",
                "/api/v3/video-assets/asset-id/adaptive/token/hls/master.m3u8");
        MockHttpServletResponse response = new MockHttpServletResponse();

        FilterChain chain = (req, res) -> ((MockHttpServletResponse) res).setStatus(200);
        filter.doFilter(request, response, chain);

        assertThat(response.getHeader(HttpHeaders.CACHE_CONTROL))
                .isEqualTo("private, max-age=60, s-maxage=0, must-revalidate");
        assertThat(response.getHeader(HttpHeaders.PRAGMA)).isEmpty();
        assertThat(response.getHeader(HttpHeaders.VARY)).isEqualTo("Authorization, Cookie");
        assertThat(response.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
    }

    @Test
    @DisplayName("manifest cache is bounded below edge token expiry when media-domain auth is enabled")
    void manifestCacheIsBoundedBelowEdgeTokenExpiry() throws Exception {
        configureDefaults();
        ReflectionTestUtils.setField(filter, "manifestCacheSeconds", 120L);
        ReflectionTestUtils.setField(filter, "edgeAuthMode", "media_hmac_query");
        ReflectionTestUtils.setField(filter, "edgeHmacSecret", "secret");
        ReflectionTestUtils.setField(filter, "edgeTokenExpirySeconds", 30L);

        MockHttpServletRequest request = new MockHttpServletRequest("GET",
                "/api/v3/video-assets/asset-id/adaptive/token/dash/manifest.mpd");
        MockHttpServletResponse response = new MockHttpServletResponse();

        FilterChain chain = (req, res) -> ((MockHttpServletResponse) res).setStatus(200);
        filter.doFilter(request, response, chain);

        assertThat(response.getHeader(HttpHeaders.CACHE_CONTROL))
                .isEqualTo("private, max-age=25, s-maxage=0, must-revalidate");
    }

    @Test
    @DisplayName("manifest cache is disabled when edge token expiry leaves no safe cache window")
    void manifestCacheIsDisabledWhenEdgeTokenExpiryLeavesNoSafeWindow() throws Exception {
        configureDefaults();
        ReflectionTestUtils.setField(filter, "manifestCacheSeconds", 60L);
        ReflectionTestUtils.setField(filter, "edgeAuthMode", "media_hmac_query");
        ReflectionTestUtils.setField(filter, "edgeHmacSecret", "secret");
        ReflectionTestUtils.setField(filter, "edgeTokenExpirySeconds", 4L);

        MockHttpServletRequest request = new MockHttpServletRequest("GET",
                "/api/v3/video-assets/asset-id/adaptive/token/hls/master.m3u8");
        MockHttpServletResponse response = new MockHttpServletResponse();

        FilterChain chain = (req, res) -> ((MockHttpServletResponse) res).setStatus(200);
        filter.doFilter(request, response, chain);

        assertThat(response.getHeader(HttpHeaders.CACHE_CONTROL))
                .isEqualTo("private, no-store, max-age=0, s-maxage=0, must-revalidate");
        assertThat(response.getHeader(HttpHeaders.PRAGMA)).isEqualTo("no-cache");
        assertThat(response.getDateHeader(HttpHeaders.EXPIRES)).isZero();
    }

    @Test
    @DisplayName("object redirect responses get shorter cache headers")
    void objectRedirectResponsesGetShorterCacheHeaders() throws Exception {
        configureDefaults();

        MockHttpServletRequest request = new MockHttpServletRequest("GET",
                "/api/v3/video-assets/asset-id/adaptive/token/object");
        MockHttpServletResponse response = new MockHttpServletResponse();

        FilterChain chain = (req, res) -> ((MockHttpServletResponse) res).setStatus(302);
        filter.doFilter(request, response, chain);

        assertThat(response.getHeader(HttpHeaders.CACHE_CONTROL))
                .isEqualTo("private, max-age=30, s-maxage=0, must-revalidate");
    }

    @Test
    @DisplayName("object redirect cache is bounded below the presigned segment TTL")
    void objectRedirectCacheIsBoundedBelowPresignedSegmentTtl() throws Exception {
        configureDefaults();
        ReflectionTestUtils.setField(filter, "objectRedirectCacheSeconds", 60L);
        ReflectionTestUtils.setField(filter, "segmentPresignTtlSeconds", 20L);

        MockHttpServletRequest request = new MockHttpServletRequest("GET",
                "/api/v3/video-assets/asset-id/adaptive/token/object");
        MockHttpServletResponse response = new MockHttpServletResponse();

        FilterChain chain = (req, res) -> ((MockHttpServletResponse) res).setStatus(302);
        filter.doFilter(request, response, chain);

        assertThat(response.getHeader(HttpHeaders.CACHE_CONTROL))
                .isEqualTo("private, max-age=15, s-maxage=0, must-revalidate");
    }

    private void configureDefaults() {
        ReflectionTestUtils.setField(filter, "manifestCacheSeconds", 60L);
        ReflectionTestUtils.setField(filter, "objectRedirectCacheSeconds", 30L);
        ReflectionTestUtils.setField(filter, "segmentPresignTtlSeconds", 120L);
        ReflectionTestUtils.setField(filter, "edgeAuthMode", "disabled");
        ReflectionTestUtils.setField(filter, "edgeHmacSecret", "");
        ReflectionTestUtils.setField(filter, "edgeTokenExpirySeconds", 300L);
    }
}
