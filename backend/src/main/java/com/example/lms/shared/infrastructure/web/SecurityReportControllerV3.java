package com.example.lms.shared.infrastructure.web;

import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Browser security report sink.
 *
 * <p>Browsers send CSP report-only violations with different content types
 * ({@code application/csp-report} and {@code application/reports+json}), so the
 * endpoint accepts the raw body and logs a bounded, sanitized sample.</p>
 */
@Hidden
@Slf4j
@RestController
@RequestMapping("/api/v3/security")
public class SecurityReportControllerV3 {

    private static final int MAX_LOG_CHARS = 4096;

    @PostMapping(value = "/csp-report", consumes = MediaType.ALL_VALUE)
    public ResponseEntity<Void> recordCspReport(
            @RequestBody(required = false) String payload,
            @RequestHeader(value = "User-Agent", required = false) String userAgent,
            @RequestHeader(value = "Origin", required = false) String origin,
            @RequestHeader(value = "Referer", required = false) String referer,
            HttpServletRequest request
    ) {
        log.info(
                "CSP report-only violation: ip={} origin={} referer={} ua={} payload={}",
                sanitize(clientIp(request)),
                sanitize(origin),
                sanitize(referer),
                sanitize(userAgent),
                sanitize(payload)
        );
        return ResponseEntity.noContent().build();
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            String[] addresses = forwardedFor.split(",");
            for (int index = addresses.length - 1; index >= 0; index--) {
                String address = addresses[index].trim();
                if (!address.isEmpty()) {
                    return address;
                }
            }
        }
        return request.getRemoteAddr();
    }

    private String sanitize(String value) {
        if (value == null || value.isBlank()) {
            return "(empty)";
        }

        String normalized = value
                .replace('\r', ' ')
                .replace('\n', ' ')
                .replace('\t', ' ')
                .trim();

        if (normalized.length() <= MAX_LOG_CHARS) {
            return normalized;
        }

        return normalized.substring(0, MAX_LOG_CHARS) + "...";
    }
}
