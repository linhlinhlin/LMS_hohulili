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

    private final com.example.lms.repository.FileAttachmentRepository fileAttachmentRepository;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
        "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff", 
        "pdf", "doc", "docx", "ppt", "pptx", 
        "xls", "xlsx", "zip", "rar", "mp4", "avi", "mov", "mp3", "wav"
    );

    public com.example.lms.dto.FileUploadDTOs.FileUploadResponse uploadFile(
            MultipartFile file, 
            User currentUser, 
            com.example.lms.dto.FileUploadDTOs.FileUploadRequest request) {
        
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

            // Determine file category
            com.example.lms.entity.FileAttachment.FileCategory category = determineFileCategory(file.getContentType());

            // Save to database
            // Handle null currentUser for public uploads (e.g. EditorJS)
            java.util.UUID uploaderId = (currentUser != null) ? currentUser.getId() : java.util.UUID.fromString("00000000-0000-0000-0000-000000000000");

            // Save to database
            com.example.lms.entity.FileAttachment attachment = com.example.lms.entity.FileAttachment.builder()
                    .originalFilename(originalFileName)
                    .storedFilename(fileName)
                    .storagePath(filePath.toString().replace('\\', '/'))
                    .contentType(file.getContentType())
                    .fileSize(file.getSize())
                    .status("TEMP") // Mark as temp initially
                    .entityType("TEMP") // Mandatory field fallback
                    .uploadedBy(uploaderId)
                    .fileCategory(category)
                    .build();
            
            attachment = fileAttachmentRepository.save(attachment);

            // Generate file URL (using ID for streaming if preferred, or direct static path)
            // The frontend expects /api/v1/files/view/{id} so we should probably use that or similar.
            // But here we keep the existing fileUrl logic for compatibility, but also return ID.
            String fileUrl = baseUrl + "/api/v1/files/view/" + attachment.getId();

            return com.example.lms.dto.FileUploadDTOs.FileUploadResponse.builder()
                    .id(attachment.getId())
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

    public com.example.lms.dto.FileUploadDTOs.SignedUrlResponse generateSignedUrl(
            User currentUser,
            com.example.lms.dto.FileUploadDTOs.GenerateSignedUrlRequest request) {
        
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

        return com.example.lms.dto.FileUploadDTOs.SignedUrlResponse.builder()
                .uploadUrl(uploadUrl)
                .fileUrl(fileUrl)
                .fileId(fileName)
                .expiresAt(LocalDateTime.now().plusHours(1).atZone(java.time.ZoneId.systemDefault()).toEpochSecond())
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

    public boolean validateUpload(User currentUser, com.example.lms.dto.FileUploadDTOs.ValidateUploadRequest request) {
        // Simple validation - in a real implementation, this would verify the upload
        return request.getFileUrl() != null && !request.getFileUrl().trim().isEmpty();
    }

    public void deleteFile(User currentUser, com.example.lms.dto.FileUploadDTOs.DeleteFileRequest request) {
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
    private com.example.lms.entity.FileAttachment.FileCategory determineFileCategory(String contentType) {
        if (contentType == null) return com.example.lms.entity.FileAttachment.FileCategory.OTHER;
        
        if (contentType.startsWith("image/")) return com.example.lms.entity.FileAttachment.FileCategory.IMAGE;
        if (contentType.startsWith("video/")) return com.example.lms.entity.FileAttachment.FileCategory.VIDEO;
        if (contentType.startsWith("audio/")) return com.example.lms.entity.FileAttachment.FileCategory.AUDIO;
        if (contentType.equals("application/pdf") || contentType.startsWith("text/") || contentType.contains("document") || contentType.contains("msword")) {
            return com.example.lms.entity.FileAttachment.FileCategory.DOCUMENT;
        }
        if (contentType.contains("zip") || contentType.contains("compressed") || contentType.contains("tar")) {
            return com.example.lms.entity.FileAttachment.FileCategory.ARCHIVE;
        }
        
        return com.example.lms.entity.FileAttachment.FileCategory.OTHER;
    }
}
