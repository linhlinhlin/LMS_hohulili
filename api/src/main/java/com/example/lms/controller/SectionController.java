package com.example.lms.controller;

import com.example.lms.entity.Section;
import com.example.lms.service.SectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sections")
@RequiredArgsConstructor
public class SectionController {

    private final SectionService sectionService;

    // API Đa năng: Tạo Section bới hỗ trợ Upload File
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<com.example.lms.dto.response.SectionResponse> createSection(
            @RequestParam("lessonId") UUID lessonId,
            @RequestParam("title") String title,
            @RequestParam("type") String typeStr, // "TEXT", "VIDEO", "FILE"
            @RequestParam(value = "content", required = false) String content, // HTML
            @RequestParam(value = "videoUrl", required = false) String videoUrl, // Explicit videoUrl param
            @RequestParam(value = "isRequired", required = false, defaultValue = "false") Boolean isRequired,
            @RequestParam(value = "file", required = false) MultipartFile file // Chỉ dùng khi type=FILE
    ) {
        Section.SectionType type = Section.SectionType.valueOf(typeStr.toUpperCase());
        // Use videoUrl if content is null/empty and type is VIDEO
        String finalContent = (type == Section.SectionType.VIDEO && (content == null || content.isEmpty())) ? videoUrl : content;
        
        Section newSection = sectionService.createSection(lessonId, title, type, finalContent, isRequired, file);
        
        return ResponseEntity.ok(com.example.lms.dto.response.SectionResponse.fromEntity(newSection));
    }

    @PutMapping(value = "/{sectionId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<com.example.lms.dto.response.SectionResponse> updateSection(
            @PathVariable UUID sectionId,
            @RequestParam("title") String title,
            @RequestParam("type") String typeStr,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "videoUrl", required = false) String videoUrl,
            @RequestParam(value = "isRequired", required = false, defaultValue = "false") Boolean isRequired,
            @RequestParam(value = "file", required = false) MultipartFile file
    ) {
        Section.SectionType type = Section.SectionType.valueOf(typeStr.toUpperCase());
        String finalContent = (type == Section.SectionType.VIDEO && (content == null || content.isEmpty())) ? videoUrl : content;
        
        Section updatedSection = sectionService.updateSection(sectionId, title, type, finalContent, isRequired, file);
        return ResponseEntity.ok(com.example.lms.dto.response.SectionResponse.fromEntity(updatedSection));
    }
    
    @GetMapping("/lesson/{lessonId}")
    public ResponseEntity<List<com.example.lms.dto.response.SectionResponse>> getSectionsByLesson(@PathVariable UUID lessonId) {
        List<Section> sections = sectionService.getSectionsByLessonId(lessonId);
        List<com.example.lms.dto.response.SectionResponse> responses = sections.stream()
                .map(com.example.lms.dto.response.SectionResponse::fromEntity)
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{sectionId}")
    public ResponseEntity<Void> deleteSection(@PathVariable UUID sectionId) {
        sectionService.deleteSection(sectionId);
        return ResponseEntity.ok().build();
    }
}
