package com.example.lms.shared.domain.service;

import com.example.lms.shared.domain.model.ContentBlock;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ContentBlockSanitizerTest {

    @Test
    @DisplayName("keeps ordinary Vietnamese prose containing online equals")
    void sanitizeDataKeepsOnlineEqualsProse() {
        String text = "Học online = tốt cho học viên";

        assertThat(ContentBlockSanitizer.sanitizeData(Map.of("caption", text)).get("caption"))
                .isEqualTo(text);
    }

    @Test
    @DisplayName("keeps plain assignments beginning with on")
    void sanitizeDataKeepsPlainAssignments() {
        String text = "only=1 và one=2";

        assertThat(ContentBlockSanitizer.sanitizeData(Map.of("text", text)).get("text"))
                .isEqualTo(text);
    }

    @Test
    @DisplayName("keeps JavaScript language prose outside URL fields")
    void sanitizeDataKeepsJavaScriptLanguageProse() {
        String text = "JavaScript: ngôn ngữ lập trình";

        assertThat(ContentBlockSanitizer.sanitizeData(Map.of("caption", text)).get("caption"))
                .isEqualTo(text);
    }

    @Test
    @DisplayName("keeps LaTeX containing an equals sign")
    void sanitizeDataKeepsLatexWithEquals() {
        String latex = "\\text{online = true} \\Rightarrow x = 1";

        assertThat(ContentBlockSanitizer.sanitizeData(Map.of("formula", latex)).get("formula"))
                .isEqualTo(latex);
    }

    @Test
    @DisplayName("removes executable HTML while keeping ordinary markup")
    void sanitizeHtmlRemovesExecutableBrowserFeatures() {
        String unsafe = """
                <p onclick="alert(1)">An toàn</p>
                <script>alert(1)</script>
                <img src="javascript:alert(2)" onerror="steal()">
                <iframe src="https://evil.example"></iframe>
                """;

        String sanitized = ContentBlockSanitizer.sanitizeHtml(unsafe);

        assertThat(sanitized).contains("<p>An toàn</p>");
        assertThat(sanitized).doesNotContain("onclick", "<script", "onerror", "<iframe", "javascript:");
    }

    @Test
    @DisplayName("removes onclick from anchor HTML")
    void sanitizeDataRemovesAnchorOnclick() {
        String sanitized = ContentBlockSanitizer.sanitizeData(
                Map.of("html", "<a onclick=\"x()\">Link</a>"))
                .get("html").toString();

        assertThat(sanitized).isEqualTo("<a>Link</a>");
    }

    @Test
    @DisplayName("removes onerror from image HTML")
    void sanitizeDataRemovesImageOnerror() {
        String sanitized = ContentBlockSanitizer.sanitizeData(
                Map.of("html", "<img src=x onerror=alert(1)>"))
                .get("html").toString();

        assertThat(sanitized).isEqualTo("<img src=x>");
    }

    @Test
    @DisplayName("removes script elements")
    void sanitizeDataRemovesScriptElement() {
        String sanitized = ContentBlockSanitizer.sanitizeData(
                Map.of("html", "<p>Safe</p><script>alert(1)</script>"))
                .get("html").toString();

        assertThat(sanitized).isEqualTo("<p>Safe</p>");
    }

    @Test
    @DisplayName("removes iframe elements carrying srcdoc")
    void sanitizeDataRemovesIframeSrcdoc() {
        String sanitized = ContentBlockSanitizer.sanitizeData(
                Map.of("html", "<iframe srcdoc=\"<script>alert(1)</script>\"></iframe>"))
                .get("html").toString();

        assertThat(sanitized).doesNotContain("<iframe", "srcdoc", "<script");
    }

    @Test
    @DisplayName("blocks javascript protocol in URL fields")
    void sanitizeDataBlocksJavascriptUrl() {
        assertThat(ContentBlockSanitizer.sanitizeData(
                Map.of("url", " \tjavascript:alert(1)"))).containsEntry("url", "about:blank");
    }

    @Test
    @DisplayName("blocks HTML data protocol in URL fields")
    void sanitizeDataBlocksHtmlDataUrl() {
        assertThat(ContentBlockSanitizer.sanitizeData(
                Map.of("url", "data:text/html;base64,PHNjcmlwdD4=")))
                .containsEntry("url", "about:blank");
    }

    @Test
    @DisplayName("recursively sanitizes content block maps and lists")
    void sanitizeBlocksRecursivelySanitizesNestedValues() {
        ContentBlock block = ContentBlock.create("TEXT", Map.of(
                "html", "<img src=x onerror=alert(1)>",
                "items", List.of(Map.of("url", "javascript:alert(1)"))
        ));

        List<ContentBlock> sanitized = ContentBlockSanitizer.sanitizeBlocks(List.of(block));

        String html = sanitized.getFirst().getData().get("html").toString();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items =
                (List<Map<String, Object>>) sanitized.getFirst().getData().get("items");
        assertThat(html).doesNotContain("onerror");
        assertThat(items.getFirst().get("url").toString()).isEqualTo("about:blank");
    }

    @Test
    @DisplayName("allows only internal simulation entry URLs")
    void simulationUrlAllowlistRejectsExternalOrigins() {
        assertThat(ContentBlockSanitizer.isAllowedSimulationUrl("/simulations/bridge/index.html")).isTrue();
        assertThat(ContentBlockSanitizer.isAllowedSimulationUrl(
                "https://holilihu.online/simulations/bridge/index.html")).isTrue();
        assertThat(ContentBlockSanitizer.isAllowedSimulationUrl(
                "https://media.holilihu.online/simulations/bridge/index.html")).isTrue();

        assertThat(ContentBlockSanitizer.isAllowedSimulationUrl(
                "https://evil.example/simulations/bridge/index.html")).isFalse();
        assertThat(ContentBlockSanitizer.isAllowedSimulationUrl("javascript:alert(1)")).isFalse();
    }
}
