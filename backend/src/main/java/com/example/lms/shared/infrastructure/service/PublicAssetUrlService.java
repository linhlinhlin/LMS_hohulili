package com.example.lms.shared.infrastructure.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class PublicAssetUrlService {

    private static final Pattern IMAGE_FILENAME = Pattern.compile("(?i)^[a-z0-9][a-z0-9._-]*\\.(jpe?g|png|webp|gif|svg)$");
    private static final Pattern IMAGE_PATH = Pattern.compile("(?i)^.+\\.(jpe?g|png|webp|gif|svg)$");

    private final String publicBaseUrl;
    private final String localBaseUrl;

    public PublicAssetUrlService(
            @Value("${cloudflare.r2.public-url:}") String publicBaseUrl,
            @Value("${app.storage.local.base-url:http://localhost:8088/uploads}") String localBaseUrl
    ) {
        this.publicBaseUrl = trimTrailingSlash(publicBaseUrl);
        this.localBaseUrl = trimTrailingSlash(localBaseUrl);
    }

    public String resolveCourseThumbnailUrl(String value) {
        return resolveStorageUrl(value, "course-thumbnails");
    }

    public String resolveStorageUrl(String value, String defaultFolder) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        if (trimmed.isEmpty() || isAbsoluteUrl(trimmed) || isBrowserLocalUrl(trimmed)) {
            return trimmed.isEmpty() ? null : trimmed;
        }

        String key = trimmed.replace('\\', '/');
        String lower = key.toLowerCase(Locale.ROOT);
        if (lower.startsWith("/assets/")
                || lower.startsWith("assets/")
                || lower.startsWith("/api/")
                || lower.startsWith("api/")) {
            return trimmed;
        }

        key = stripLeadingSlash(key);
        if (key.startsWith("uploads/")) {
            key = key.substring("uploads/".length());
        }

        if (!key.contains("/") && hasText(defaultFolder) && IMAGE_FILENAME.matcher(key).matches()) {
            key = defaultFolder + "/" + key;
        }

        if (!isSafeStorageKey(key) || !IMAGE_PATH.matcher(key).matches()) {
            return trimmed;
        }

        String baseUrl = hasText(publicBaseUrl) ? publicBaseUrl : localBaseUrl;
        return hasText(baseUrl) ? baseUrl + "/" + key : trimmed;
    }

    private boolean isAbsoluteUrl(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.startsWith("http://")
                || lower.startsWith("https://")
                || lower.startsWith("//");
    }

    private boolean isBrowserLocalUrl(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.startsWith("data:")
                || lower.startsWith("blob:");
    }

    private boolean isSafeStorageKey(String value) {
        return hasText(value)
                && !value.contains("..")
                && !value.startsWith("/")
                && !value.contains("://")
                && !value.contains("\\");
    }

    private String stripLeadingSlash(String value) {
        String result = value;
        while (result.startsWith("/")) {
            result = result.substring(1);
        }
        return result;
    }

    private static String trimTrailingSlash(String value) {
        if (!hasText(value)) {
            return "";
        }
        String result = value.trim();
        while (result.endsWith("/")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
