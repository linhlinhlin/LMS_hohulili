package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.UUID;

@Entity
@Table(name = "question_options")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionOption {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    @JsonIgnore
    private Question question;

    @Column(name = "option_key", nullable = false, length = 1)
    private String optionKey; // A, B, C, D

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    @Convert(converter = com.example.lms.converter.ContentBlockListConverter.class)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    private java.util.List<com.example.lms.domain.ContentBlock> contentBlocks;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    // Backward compatibility methods
    public String getContent() {
        if (contentBlocks == null || contentBlocks.isEmpty()) {
            return "";
        }
        for (com.example.lms.domain.ContentBlock block : contentBlocks) {
            if ("text".equals(block.getType()) && block.getData() != null) {
                Object html = block.getData().get("html");
                return html != null ? html.toString() : "";
            }
        }
        return "";
    }

    public void setContent(String content) {
        if (content == null) {
            this.contentBlocks = null;
        } else {
            com.example.lms.domain.ContentBlock textBlock = com.example.lms.domain.ContentBlock.builder()
                .type("text")
                .data(java.util.Map.of("html", content))
                .build();
            this.contentBlocks = java.util.Collections.singletonList(textBlock);
        }
    }
}
