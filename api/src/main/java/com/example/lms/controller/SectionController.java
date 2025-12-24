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

    // API Đa năng: Tạo Section bới hỗ trợ Upload File
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createSection(
            @RequestParam("lessonId") UUID lessonId,
            @RequestParam("title") String title,
            @RequestParam("type") String typeStr, // "TEXT", "VIDEO", "FILE"
            @RequestParam(value = "content", required = false) String content, // HTML
            @RequestParam(value = "videoUrl", required = false) String videoUrl, // Explicit videoUrl param
            @RequestParam(value = "videoType", required = false) String videoType, // [NEW] "YOUTUBE" or "CLOUDFLARE"
            @RequestParam(value = "cfObjectKey", required = false) String cfObjectKey, // [NEW] R2 object key
            @RequestParam(value = "isRequired", required = false, defaultValue = "false") Boolean isRequired,
            @RequestParam(value = "file", required = false) MultipartFile file // Chỉ dùng khi type=FILE
    ) {
        Section.SectionType type = Section.SectionType.valueOf(typeStr.toUpperCase());
        // Use videoUrl if content is null/empty and type is VIDEO
        String finalContent = (type == Section.SectionType.VIDEO && (content == null || content.isEmpty())) ? videoUrl : content;
        
        Section newSection = sectionService.createSection(lessonId, title, type, finalContent, isRequired, file);
        
        // [NEW] Update video metadata if Cloudflare R2 is used
        if (type == Section.SectionType.VIDEO && videoType != null && cfObjectKey != null) {
            newSection = sectionService.updateSectionVideo(newSection.getId(), videoType, videoUrl, cfObjectKey);
        }
        
        return ResponseEntity.ok(newSection);
    }

    @PutMapping(value = "/{sectionId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateSection(
            @PathVariable UUID sectionId,
            @RequestParam("title") String title,
            @RequestParam("type") String typeStr,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "videoUrl", required = false) String videoUrl,
            @RequestParam(value = "videoType", required = false) String videoType, // [NEW] "YOUTUBE" or "CLOUDFLARE"
            @RequestParam(value = "cfObjectKey", required = false) String cfObjectKey, // [NEW] R2 object key
            @RequestParam(value = "isRequired", required = false, defaultValue = "false") Boolean isRequired,
            @RequestParam(value = "file", required = false) MultipartFile file
    ) {
        Section.SectionType type = Section.SectionType.valueOf(typeStr.toUpperCase());
        String finalContent = (type == Section.SectionType.VIDEO && (content == null || content.isEmpty())) ? videoUrl : content;
        
        Section updatedSection = sectionService.updateSection(sectionId, title, type, finalContent, isRequired, file);
        
        // [NEW] Update video metadata if Cloudflare R2 is used
        if (type == Section.SectionType.VIDEO && videoType != null && cfObjectKey != null) {
            updatedSection = sectionService.updateSectionVideo(sectionId, videoType, videoUrl, cfObjectKey);
        }
        
        return ResponseEntity.ok(updatedSection);
    }
    
    @GetMapping("/lesson/{lessonId}")
    public ResponseEntity<List<Section>> getSectionsByLesson(@PathVariable UUID lessonId) {
        return ResponseEntity.ok(sectionService.getSectionsByLessonId(lessonId));
    }

    @DeleteMapping("/{sectionId}")
    public ResponseEntity<Void> deleteSection(@PathVariable UUID sectionId) {
        sectionService.deleteSection(sectionId);
        return ResponseEntity.ok().build();
    }
}
