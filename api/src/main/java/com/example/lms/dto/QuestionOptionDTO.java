package com.example.lms.dto;

import com.example.lms.entity.QuestionOption;
import java.util.UUID;

public class QuestionOptionDTO {
    private UUID id;
    private String optionKey;
    private String content;
    private Integer displayOrder;

    public QuestionOptionDTO() {}

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getOptionKey() { return optionKey; }
    public void setOptionKey(String optionKey) { this.optionKey = optionKey; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }

    public static QuestionOptionDTOBuilder builder() { return new QuestionOptionDTOBuilder(); }
    public static class QuestionOptionDTOBuilder {
        private QuestionOptionDTO dto = new QuestionOptionDTO();
        public QuestionOptionDTOBuilder id(UUID id) { dto.setId(id); return this; }
        public QuestionOptionDTOBuilder optionKey(String k) { dto.setOptionKey(k); return this; }
        public QuestionOptionDTOBuilder content(String c) { dto.setContent(c); return this; }
        public QuestionOptionDTOBuilder displayOrder(Integer d) { dto.setDisplayOrder(d); return this; }
        public QuestionOptionDTO build() { return dto; }
    }

    public static QuestionOptionDTO fromEntity(QuestionOption option) {
        if (option == null) return null;
        return builder()
                .id(option.getId())
                .optionKey(option.getOptionKey())
                .content(option.getContent())
                .displayOrder(option.getDisplayOrder())
                .build();
    }
}
