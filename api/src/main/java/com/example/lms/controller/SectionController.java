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
    
    // Update video metadata for a Section (e.g., after uploading to R2)
    @PatchMapping("/{sectionId}/video")
    public ResponseEntity<Section> updateSectionVideo(
            @PathVariable UUID sectionId,
            @RequestParam(value = "videoType", required = false) String videoType,
            @RequestParam(value = "videoUrl", required = false) String videoUrl,
            @RequestParam(value = "cfObjectKey", required = false) String cfObjectKey
    ) {
        Section s = sectionService.updateSectionVideo(sectionId, videoType, videoUrl, cfObjectKey);
        return ResponseEntity.ok(s);
    }

    // API Đa năng: Tạo Section bới hỗ trợ Upload File (Updated for Unified Aggregate Save)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<com.example.lms.dto.response.SectionResponse> createSection(
            @RequestPart("data") com.example.lms.dto.request.SectionRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {
        Section newSection = sectionService.createSection(request, file);
        return ResponseEntity.ok(com.example.lms.dto.response.SectionResponse.fromEntity(newSection));
    }

    @PutMapping(value = "/{sectionId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<com.example.lms.dto.response.SectionResponse> updateSection(
            @PathVariable UUID sectionId,
            @RequestPart("data") com.example.lms.dto.request.SectionRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {
        Section updatedSection = sectionService.updateSection(sectionId, request, file);
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
