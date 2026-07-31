package com.example.lms.shared.domain.service;

import com.example.lms.shared.domain.model.ContentBlock;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Sanitizes teacher-authored rich content before it crosses learner/admin browser boundaries.
 */
public final class ContentBlockSanitizer {

    private static final Pattern DANGEROUS_ELEMENTS = Pattern.compile(
            "(?is)<\\s*(script|style|iframe|object|embed|link|meta|base|form)\\b[^>]*>.*?<\\s*/\\s*\\1\\s*>"
                    + "|<\\s*(script|style|iframe|object|embed|link|meta|base|form)\\b[^>]*/?>"
    );
    private static final Pattern EVENT_HANDLER_ATTRIBUTES = Pattern.compile(
            "(?is)\\s+on[a-z0-9_:-]+\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)"
    );
    private static final Pattern SRCDOC_ATTRIBUTE = Pattern.compile(
            "(?is)\\s+srcdoc\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)"
    );
    private static final Pattern SCRIPT_PROTOCOL = Pattern.compile("(?is)(java\\s*script|vb\\s*script)\\s*:");
    private static final Pattern DANGEROUS_DATA_URL = Pattern.compile("(?is)data\\s*:\\s*(text/html|image/svg\\+xml)");

    private ContentBlockSanitizer() {
    }

    public static List<ContentBlock> sanitizeBlocks(List<ContentBlock> blocks) {
        if (blocks == null) {
            return null;
        }
        return blocks.stream()
                .map(ContentBlockSanitizer::sanitizeBlock)
                .toList();
    }

    public static ContentBlock sanitizeBlock(ContentBlock block) {
        if (block == null) {
            return null;
        }
        return block.withData(sanitizeData(block.getData()));
    }

    public static Map<String, Object> sanitizeData(Map<String, Object> data) {
        if (data == null || data.isEmpty()) {
            return Map.of();
        }

        Map<String, Object> sanitized = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            String key = entry.getKey();
            sanitized.put(key, sanitizeValue(entry.getValue(), isUrlField(key)));
        }
        return sanitized;
    }

    public static Object sanitizeValue(Object value) {
        return sanitizeValue(value, false);
    }

    private static Object sanitizeValue(Object value, boolean urlField) {
        if (value instanceof String text) {
            if (text.indexOf('<') >= 0) {
                return sanitizeHtml(text);
            }
            return urlField && startsWithDangerousProtocol(text) ? "about:blank" : text;
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> sanitized = new LinkedHashMap<>();
            map.forEach((key, item) -> {
                String field = String.valueOf(key);
                sanitized.put(field, sanitizeValue(item, isUrlField(field)));
            });
            return sanitized;
        }
        if (value instanceof List<?> list) {
            List<Object> sanitized = new ArrayList<>(list.size());
            for (Object item : list) {
                sanitized.add(sanitizeValue(item, urlField));
            }
            return sanitized;
        }
        return value;
    }

    public static String sanitizeHtml(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }

        String sanitized = DANGEROUS_ELEMENTS.matcher(value).replaceAll("");
        sanitized = SRCDOC_ATTRIBUTE.matcher(sanitized).replaceAll("");
        sanitized = EVENT_HANDLER_ATTRIBUTES.matcher(sanitized).replaceAll("");

        String trimmed = sanitized.trim();
        if (startsWithDangerousProtocol(trimmed)) {
            return "about:blank";
        }
        sanitized = SCRIPT_PROTOCOL.matcher(sanitized).replaceAll("#blocked:");
        sanitized = DANGEROUS_DATA_URL.matcher(sanitized).replaceAll("about:blank");
        return sanitized;
    }

    public static boolean isAllowedSimulationUrl(Object value) {
        if (!(value instanceof String raw) || raw.isBlank()) {
            return false;
        }

        String url = raw.trim();
        try {
            URI uri = URI.create(url);
            String path = uri.getPath() != null ? uri.getPath() : "";
            if (!path.startsWith("/simulations/")) {
                return false;
            }
            if (uri.getScheme() == null) {
                return url.startsWith("/simulations/");
            }

            String scheme = uri.getScheme().toLowerCase(Locale.ROOT);
            String host = uri.getHost() != null ? uri.getHost().toLowerCase(Locale.ROOT) : "";
            if ("https".equals(scheme)) {
                return "holilihu.online".equals(host) || "media.holilihu.online".equals(host);
            }
            return "http".equals(scheme) && ("localhost".equals(host) || "127.0.0.1".equals(host));
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private static boolean isUrlField(String key) {
        return "url".equalsIgnoreCase(key);
    }

    private static boolean startsWithDangerousProtocol(String value) {
        String normalized = value.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
        return normalized.startsWith("javascript:")
                || normalized.startsWith("vbscript:")
                || normalized.startsWith("data:text/html")
                || normalized.startsWith("data:image/svg+xml");
    }
}
