package com.example.lms.service;

import com.example.lms.entity.FileAttachment;
import com.example.lms.repository.FileAttachmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileService {

    private final FileAttachmentRepository fileRepository;
    // Inject thêm StorageService (Service lưu file vật lý) nếu bạn đã tách riêng
    // Ở đây tôi viết logic lưu file đơn giản vào thư mục 'uploads' để demo
    private final Path fileStorageLocation = Paths.get("uploads").toAbsolutePath().normalize();

    public FileAttachment uploadFile(MultipartFile file, UUID entityId, String entityType, FileAttachment.FileCategory category) {
        // 1. Validate file
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        if (originalFileName.contains("..")) {
            throw new RuntimeException("Filename contains invalid path sequence " + originalFileName);
        }

        // 2. Tạo tên file lưu trữ (UUID để tránh trùng)
        String storedFileName = UUID.randomUUID().toString() + "_" + originalFileName;

        try {
            // 3. Lưu file vật lý (Copy vào folder uploads)
            if (!Files.exists(fileStorageLocation)) Files.createDirectories(fileStorageLocation);
            Path targetLocation = fileStorageLocation.resolve(storedFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // 4. Lưu Metadata vào DB
            FileAttachment attachment = FileAttachment.builder()
                    .entityId(entityId)
                    .entityType(entityType) // Ví dụ: "SECTION_MATERIAL"
                    .originalFilename(originalFileName)
                    .storedFilename(storedFileName)
                    .storagePath(targetLocation.toString())
                    .contentType(file.getContentType())
                    .fileSize(file.getSize())
                    .fileCategory(category)
                    .status("AVAILABLE")
                    .uploadedBy(UUID.randomUUID()) // TODO: Lấy ID từ SecurityContextHolder
                    .build();

            return fileRepository.save(attachment);

        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + originalFileName, ex);
        }
    }

    public List<FileAttachment> getFilesByEntity(UUID entityId, String entityType) {
        return fileRepository.findByEntityIdAndEntityTypeAndStatus(entityId, entityType, "AVAILABLE");
    }
}
