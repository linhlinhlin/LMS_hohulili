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
    public Section createSection(UUID lessonId, String title, Section.SectionType type, String contentOrUrl, MultipartFile file) {
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
                .isRequired(false)
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
                    // Upload file và link vào Section ID
                    // Assuming FileCategory.DOCUMENT for generic files, can be refined based on mime type
                    fileService.uploadFile(file, section.getId(), "SECTION_MATERIAL", FileAttachment.FileCategory.DOCUMENT);
                    // Có thể set fileUrl vào section để access nhanh nếu muốn
                    section.setFileUrl("/api/v1/files/download/" + section.getId()); 
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
}
