package com.example.lms.dto;

import com.example.lms.entity.QuestionOption;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class QuestionOptionDTO {
    private UUID id;
    private String optionKey;
    private String content;
    private Integer displayOrder;

    public static QuestionOptionDTO fromEntity(QuestionOption option) {
        return QuestionOptionDTO.builder()
                .id(option.getId())
                .optionKey(option.getOptionKey())
                .content(option.getContent())
                .displayOrder(option.getDisplayOrder())
                .build();
    }
}