package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.Lesson;
import com.example.lms.entity.LessonAttachment;
import com.example.lms.entity.User;
import com.example.lms.repository.LessonAttachmentRepository;
import com.example.lms.repository.LessonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class LessonAttachmentService {

    private final LessonAttachmentRepository attachmentRepository;
    private final LessonRepository lessonRepository;
    private final FileUploadService fileUploadService;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
        "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "mp4", "avi", "mov", "mp3", "wav"
    );

    public LessonAttachment addAttachment(UUID lessonId, User currentUser, MultipartFile file, Integer displayOrder) {
        System.out.println("=== DEBUG addAttachment ===");
        System.out.println("Lesson ID: " + lessonId);
        System.out.println("Current User ID: " + (currentUser != null ? currentUser.getId() : "NULL"));
        System.out.println("Current User Email: " + (currentUser != null ? currentUser.getEmail() : "NULL"));
        System.out.println("Current User Role: " + (currentUser != null ? currentUser.getRole() : "NULL"));
        
        Lesson lesson = lessonRepository.findById(lessonId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy bài học"));

        System.out.println("Found Lesson: " + lesson.getTitle());
        System.out.println("Section: " + lesson.getSection().getTitle());
        System.out.println("Course: " + lesson.getSection().getCourse().getTitle());
        System.out.println("Course Teacher ID: " + lesson.getSection().getCourse().getTeacher().getId());
        System.out.println("Course Teacher Email: " + lesson.getSection().getCourse().getTeacher().getEmail());

        // Check permissions
        if (!lesson.getSection().getCourse().getTeacher().getId().equals(currentUser.getId())) {
            System.out.println("PERMISSION DENIED: Teacher ID mismatch");
            System.out.println("Expected: " + lesson.getSection().getCourse().getTeacher().getId());
            System.out.println("Actual: " + currentUser.getId());
            throw new RuntimeException("Không có quyền thêm file đính kèm");
        }
        
        System.out.println("PERMISSION GRANTED: User is teacher of this course");
        System.out.println("=== END DEBUG ===");

        // Validate file
        validateFile(file);

        // Determine file type
        String fileType = determineFileType(file.getOriginalFilename());

        // Set display order
        if (displayOrder == null) {
            Integer maxOrder = attachmentRepository.findMaxDisplayOrderByLessonId(lessonId);
            displayOrder = (maxOrder != null) ? maxOrder + 1 : 0;
        }

        // Upload file
        com.example.lms.controller.FileUploadController.FileUploadRequest request =
            new com.example.lms.controller.FileUploadController.FileUploadRequest();
        request.setType(fileType);
        com.example.lms.controller.FileUploadController.FileUploadResponse uploadResponse =
            fileUploadService.uploadFile(file, currentUser, request);

        // Create attachment
        LessonAttachment attachment = LessonAttachment.builder()
            .lesson(lesson)
            .fileName(uploadResponse.getFileName())
            .originalFileName(uploadResponse.getOriginalFileName())
            .fileUrl(uploadResponse.getFileUrl())
            .fileSize(uploadResponse.getFileSize())
            .contentType(uploadResponse.getContentType())
            .fileType(fileType)
            .displayOrder(displayOrder)
            .uploadedBy(currentUser)
            .build();

        return attachmentRepository.save(attachment);
    }

    public List<LessonAttachment> getAttachmentsByLesson(UUID lessonId, User currentUser) {
        Lesson lesson = lessonRepository.findById(lessonId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy bài học"));

        // Check permissions
        Course course = lesson.getSection().getCourse();
        boolean hasAccess = course.getTeacher().getId().equals(currentUser.getId()) ||
                           course.getEnrolledStudents().contains(currentUser);

        if (!hasAccess) {
            throw new RuntimeException("Không có quyền truy cập file đính kèm");
        }

        return attachmentRepository.findByLessonIdOrderByDisplayOrderAsc(lessonId);
    }

    public void deleteAttachment(UUID attachmentId, User currentUser) {
        LessonAttachment attachment = attachmentRepository.findById(attachmentId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy file đính kèm"));

        // Check permissions
        if (!attachment.getLesson().getSection().getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Không có quyền xóa file đính kèm");
        }

        attachmentRepository.delete(attachment);
    }

    public LessonAttachment reorderAttachment(UUID attachmentId, User currentUser, Integer newDisplayOrder) {
        LessonAttachment attachment = attachmentRepository.findById(attachmentId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy file đính kèm"));

        // Check permissions
        if (!attachment.getLesson().getSection().getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Không có quyền chỉnh sửa file đính kèm");
        }

        attachment.setDisplayOrder(newDisplayOrder);
        return attachmentRepository.save(attachment);
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new RuntimeException("File không được để trống");
        }

        if (file.getSize() > 100 * 1024 * 1024) { // 100MB limit
            throw new RuntimeException("Kích thước file vượt quá giới hạn cho phép: 100MB");
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null || fileName.trim().isEmpty()) {
            throw new RuntimeException("Tên file không hợp lệ");
        }

        String fileExtension = getFileExtension(fileName);
        if (!ALLOWED_EXTENSIONS.contains(fileExtension.toLowerCase())) {
            throw new RuntimeException("Loại file không được hỗ trợ: " + fileExtension);
        }
    }

    private String determineFileType(String filename) {
        if (filename == null) return "other";
        String lower = filename.toLowerCase();

        if (lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx")) {
            return "document";
        } else if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) {
            return "presentation";
        } else if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) {
            return "spreadsheet";
        } else if (lower.endsWith(".mp4") || lower.endsWith(".avi") || lower.endsWith(".mov")) {
            return "video";
        } else if (lower.endsWith(".mp3") || lower.endsWith(".wav")) {
            return "audio";
        }
        return "other";
    }

    private String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf(".") + 1);
    }
}