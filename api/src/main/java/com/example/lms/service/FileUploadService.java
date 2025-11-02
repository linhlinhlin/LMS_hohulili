package com.example.lms.service;

import com.example.lms.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class FileUploadService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.upload.max-size:10485760}") // 10MB default
    private long maxFileSize;

    @Value("${app.base-url:http://localhost:8088}")
    private String baseUrl;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
        "jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "ppt", "pptx", 
        "xls", "xlsx", "zip", "rar", "mp4", "avi", "mov", "mp3", "wav"
    );

    public com.example.lms.controller.FileUploadController.FileUploadResponse uploadFile(
            MultipartFile file, 
            User currentUser, 
            com.example.lms.controller.FileUploadController.FileUploadRequest request) {
        
        validateFile(file);
        
        try {
            // Create upload directory if it doesn't exist
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename
            String originalFileName = file.getOriginalFilename();
            String fileExtension = getFileExtension(originalFileName);
            String fileName = generateUniqueFileName(originalFileName, fileExtension);
            
            // Create subdirectory based on file type and date
            String subDir = getSubdirectory(request.getType());
            Path targetPath = uploadPath.resolve(subDir);
            if (!Files.exists(targetPath)) {
                Files.createDirectories(targetPath);
            }

            // Save file
            Path filePath = targetPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Generate file URL
            String fileUrl = baseUrl + "/api/v1/files/" + subDir + "/" + fileName;

            return com.example.lms.controller.FileUploadController.FileUploadResponse.builder()
                    .fileName(fileName)
                    .originalFileName(originalFileName)
                    .fileUrl(fileUrl)
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .uploadedAt(LocalDateTime.now())
                    .build();

        } catch (IOException e) {
            throw new RuntimeException("Lỗi khi upload file: " + e.getMessage(), e);
        }
    }

    public com.example.lms.controller.FileUploadController.SignedUrlResponse generateSignedUrl(
            User currentUser,
            com.example.lms.controller.FileUploadController.GenerateSignedUrlRequest request) {
        
        // Validate file extension
        String fileExtension = getFileExtension(request.getFileName());
        if (!ALLOWED_EXTENSIONS.contains(fileExtension.toLowerCase())) {
            throw new RuntimeException("Loại file không được hỗ trợ: " + fileExtension);
        }

        // Validate file size
        if (request.getFileSize() > maxFileSize) {
            throw new RuntimeException("Kích thước file vượt quá giới hạn cho phép: " + maxFileSize + " bytes");
        }

        // Generate unique filename
        String fileName = generateUniqueFileName(request.getFileName(), fileExtension);
        
        // Create subdirectory based on file type
        String subDir = getSubdirectory(request.getType());
        
        // Generate signed URL (in a real implementation, this would be a pre-signed URL for cloud storage)
        String uploadUrl = baseUrl + "/api/v1/files/upload-signed/" + subDir + "/" + fileName;
        String fileUrl = baseUrl + "/api/v1/files/" + subDir + "/" + fileName;

        return com.example.lms.controller.FileUploadController.SignedUrlResponse.builder()
                .uploadUrl(uploadUrl)
                .fileUrl(fileUrl)
                .fileName(fileName)
                .expiresAt(LocalDateTime.now().plusHours(1)) // URL expires in 1 hour
                .build();
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new RuntimeException("File không được để trống");
        }

        if (file.getSize() > maxFileSize) {
            throw new RuntimeException("Kích thước file vượt quá giới hạn cho phép: " + maxFileSize + " bytes");
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

    private String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf(".") + 1);
    }

    private String generateUniqueFileName(String originalFileName, String extension) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        
        // Remove extension from original filename
        String baseName = originalFileName;
        if (baseName.contains(".")) {
            baseName = baseName.substring(0, baseName.lastIndexOf("."));
        }
        
        // Clean filename (remove special characters)
        baseName = baseName.replaceAll("[^a-zA-Z0-9_-]", "_");
        
        return baseName + "_" + timestamp + "_" + uuid + "." + extension;
    }

    private String getSubdirectory(String type) {
        String dateDir = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy/MM"));
        
        switch (type != null ? type.toLowerCase() : "general") {
            case "avatar":
                return "avatars/" + dateDir;
            case "course":
                return "courses/" + dateDir;
            case "assignment":
                return "assignments/" + dateDir;
            case "document":
                return "documents/" + dateDir;
            case "video":
                return "videos/" + dateDir;
            case "audio":
                return "audio/" + dateDir;
            default:
                return "general/" + dateDir;
        }
    }

    public boolean validateUpload(User currentUser, com.example.lms.controller.FileUploadController.ValidateUploadRequest request) {
        // Simple validation - in a real implementation, this would verify the upload
        return request.getFileUrl() != null && !request.getFileUrl().trim().isEmpty();
    }

    public void deleteFile(User currentUser, com.example.lms.controller.FileUploadController.DeleteFileRequest request) {
        // In a real implementation, this would delete the file from storage
        // For now, we'll just validate the file URL
        if (request.getFileUrl() == null || request.getFileUrl().trim().isEmpty()) {
            throw new RuntimeException("File URL không hợp lệ");
        }
        
        // Extract file path from URL and delete
        // This is a simplified implementation
        // Extract file path from URL if needed for future physical deletion
        // String fileName = request.getFileUrl().substring(request.getFileUrl().lastIndexOf("/") + 1);
        // TODO: Implement physical deletion if files are stored locally or in cloud storage
    }
}