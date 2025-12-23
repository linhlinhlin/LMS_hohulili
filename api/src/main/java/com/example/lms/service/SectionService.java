package com.example.lms.service;

import com.example.lms.entity.*;
import com.example.lms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SectionService {

    private final SectionRepository sectionRepository;
    private final LessonRepository lessonRepository;
    private final FileService fileService;

    @Transactional
    public Section createSection(UUID lessonId, String title, Section.SectionType type, String contentOrUrl, Boolean isRequired, MultipartFile file) {
        // 1. Tìm Lesson cha
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));

        // 2. Tính Order Index (Xếp cuối cùng)
        Integer maxOrder = sectionRepository.findMaxOrderIndexByLessonId(lessonId);
        int newOrder = (maxOrder == null) ? 0 : maxOrder + 1;

        // 3. Tạo Section
        Section section = Section.builder()
                .title(title)
                .type(type)
                .lesson(lesson)
                .orderIndex(newOrder)
                .isRequired(isRequired)
                .build();

        // 4. Xử lý dữ liệu theo Type
        switch (type) {
            case TEXT:
                section.setContent(contentOrUrl); // contentOrUrl là HTML
                break;
            case VIDEO:
                section.setVideoUrl(contentOrUrl); // contentOrUrl là Link Youtube
                break;
            case FILE:
                // Lưu Section trước để có ID
                section = sectionRepository.save(section);
                if (file != null && !file.isEmpty()) {
                    FileAttachment attachment = fileService.uploadFile(file, section.getId(), "SECTION_MATERIAL", FileAttachment.FileCategory.DOCUMENT);
                    section.setFileUrl("/api/v1/files/" + attachment.getId() + "/stream"); 
                }
                break;
            default:
                break;
        }

        return sectionRepository.save(section);
    }

    @Transactional
    public Section updateSection(UUID sectionId, String title, Section.SectionType type, String contentOrUrl, Boolean isRequired, MultipartFile file) {
        Section section = getSectionById(sectionId);
        
        section.setTitle(title);
        section.setType(type);
        section.setIsRequired(isRequired);

        // Update content based on type
        switch (type) {
            case TEXT:
                section.setContent(contentOrUrl);
                section.setVideoUrl(null); 
                break;
            case VIDEO:
                section.setVideoUrl(contentOrUrl);
                section.setContent(null);
                break;
            case FILE:
                // If a NEW file is uploaded, replace the old one
                if (file != null && !file.isEmpty()) {
                     FileAttachment attachment = fileService.uploadFile(file, section.getId(), "SECTION_MATERIAL", FileAttachment.FileCategory.DOCUMENT);
                     section.setFileUrl("/api/v1/files/" + attachment.getId() + "/stream");
                }
                break;
            default:
                break;
        }

        return sectionRepository.save(section);
    }

    public List<Section> getSectionsByLessonId(UUID lessonId) {
        return sectionRepository.findByLessonIdOrderByOrderIndexAsc(lessonId);
    }
    
    public Section getSectionById(UUID sectionId) {
        return sectionRepository.findById(sectionId)
                .orElseThrow(() -> new RuntimeException("Section not found"));
    }

    public void deleteSection(UUID sectionId) {
        sectionRepository.deleteById(sectionId);
    }

    @org.springframework.transaction.annotation.Transactional
    public void migrateLegacyFileUrls() {
        List<Section> sections = sectionRepository.findByType(Section.SectionType.FILE);
        for (Section section : sections) {
            String url = section.getFileUrl();
            if (url != null && url.contains("/download/")) {
                List<com.example.lms.entity.FileAttachment> attachments = fileService.getFilesByEntity(section.getId(), "SECTION_MATERIAL");
                if (!attachments.isEmpty()) {
                    com.example.lms.entity.FileAttachment mainAttachment = attachments.get(0);
                    section.setFileUrl("/api/v1/files/" + mainAttachment.getId() + "/stream");
                    sectionRepository.save(section);
                }
            }
        }
    }
}
