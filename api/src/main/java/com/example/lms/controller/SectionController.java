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
    public ResponseEntity<?> createSection(
            @RequestParam("lessonId") UUID lessonId,
            @RequestParam("title") String title,
            @RequestParam("type") String typeStr, // "TEXT", "VIDEO", "FILE"
            @RequestParam(value = "content", required = false) String content, // HTML hoặc Video URL
            @RequestParam(value = "file", required = false) MultipartFile file // Chỉ dùng khi type=FILE
    ) {
        Section.SectionType type = Section.SectionType.valueOf(typeStr.toUpperCase());
        
        Section newSection = sectionService.createSection(lessonId, title, type, content, file);
        
        return ResponseEntity.ok(newSection);
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
