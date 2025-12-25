package com.example.lms.domain;

import java.io.Serializable;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContentBlock implements Serializable {
    private String type; // text, formula, image, table
    private Map<String, Object> data;

    // Helper to create a single text block
    public static java.util.List<ContentBlock> fromText(String text) {
        if (text == null) text = "";
        return java.util.Collections.singletonList(
            ContentBlock.builder()
                .type("text")
                .data(java.util.Map.of("html", text))
                .build()
        );
    }
}
