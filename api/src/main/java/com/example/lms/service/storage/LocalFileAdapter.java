package com.example.lms.service.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service("localFileProvider")
public class LocalFileAdapter implements FileStorageProvider {

    private final Path fileStorageLocation;

    public LocalFileAdapter(@Value("${file.upload-dir:uploads}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    @Override
    public Object resolveFile(String storageKey) throws IOException {
        try {
            Path filePath = this.fileStorageLocation.resolve(storageKey).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists()) {
                return resource;
            } else {
                throw new IOException("File not found " + storageKey);
            }
        } catch (MalformedURLException ex) {
            throw new IOException("File not found " + storageKey, ex);
        }
    }

    @Override
    public String uploadFile(MultipartFile file, String subDir) throws IOException {
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path targetLocation = this.fileStorageLocation.resolve(fileName);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        // For local, we just return the filename as key
        return fileName;
    }

    @Override
    public void deleteFile(String storageKey) {
        try {
            Path filePath = this.fileStorageLocation.resolve(storageKey).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // Log warning
            e.printStackTrace();
        }
    }

    @Override
    public String getProviderName() {
        return "LOCAL";
    }
}
