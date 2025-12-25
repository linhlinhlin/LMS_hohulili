package com.example.lms.dto;

import com.example.lms.entity.QuestionOption;
import java.util.UUID;

public class QuestionOptionDTO {
    private UUID id;
    private String optionKey;
    private String content;
    private Integer displayOrder;

    private java.util.List<com.example.lms.domain.ContentBlock> blocks;

    public QuestionOptionDTO() {}

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getOptionKey() { return optionKey; }
    public void setOptionKey(String optionKey) { this.optionKey = optionKey; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public java.util.List<com.example.lms.domain.ContentBlock> getBlocks() { return blocks; }
    public void setBlocks(java.util.List<com.example.lms.domain.ContentBlock> blocks) { this.blocks = blocks; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }

    public static QuestionOptionDTOBuilder builder() { return new QuestionOptionDTOBuilder(); }
    public static class QuestionOptionDTOBuilder {
        private QuestionOptionDTO dto = new QuestionOptionDTO();
        public QuestionOptionDTOBuilder id(UUID id) { dto.setId(id); return this; }
        public QuestionOptionDTOBuilder optionKey(String k) { dto.setOptionKey(k); return this; }
        public QuestionOptionDTOBuilder content(String c) { dto.setContent(c); return this; }
        public QuestionOptionDTOBuilder blocks(java.util.List<com.example.lms.domain.ContentBlock> b) { dto.setBlocks(b); return this; }
        public QuestionOptionDTOBuilder displayOrder(Integer d) { dto.setDisplayOrder(d); return this; }
        public QuestionOptionDTO build() { return dto; }
    }

    public static QuestionOptionDTO fromEntity(QuestionOption option) {
        if (option == null) return null;
        return builder()
                .id(option.getId())
                .optionKey(option.getOptionKey())
                .content(extractContent(option.getContentBlocks())) // Logic moved here
                .blocks(option.getContentBlocks()) // New blocks getter
                .displayOrder(option.getDisplayOrder())
                .build();
    }

    private static String extractContent(java.util.List<com.example.lms.domain.ContentBlock> blocks) {
        if (blocks == null || blocks.isEmpty()) return "";
        return blocks.stream()
                .filter(b -> "text".equals(b.getType()) && b.getData() != null)
                .map(b -> (String) b.getData().get("html"))
                .findFirst()
                .orElse("");
    }
}
