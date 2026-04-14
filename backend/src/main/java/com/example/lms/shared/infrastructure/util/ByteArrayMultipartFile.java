package com.example.lms.shared.infrastructure.util;

import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;

/**
 * In-memory MultipartFile backed by a byte array.
 * Used for passing converted documents (e.g., Gotenberg PDF output) to FileManagementService.
 */
public class ByteArrayMultipartFile implements MultipartFile {

    private final String name;
    private final String originalFilename;
    private final String contentType;
    private final byte[] bytes;

    private ByteArrayMultipartFile(String name, String originalFilename, String contentType, byte[] bytes) {
        this.name = name;
        this.originalFilename = originalFilename;
        this.contentType = contentType;
        this.bytes = bytes;
    }

    public static ByteArrayMultipartFile of(String name, String originalFilename, String contentType, byte[] bytes) {
        return new ByteArrayMultipartFile(name, originalFilename, contentType, bytes);
    }

    @Override public String getName() { return name; }
    @Override public String getOriginalFilename() { return originalFilename; }
    @Override public String getContentType() { return contentType; }
    @Override public boolean isEmpty() { return bytes.length == 0; }
    @Override public long getSize() { return bytes.length; }
    @Override public byte[] getBytes() { return bytes; }
    @Override public InputStream getInputStream() { return new ByteArrayInputStream(bytes); }
    @Override public void transferTo(File dest) throws IOException { Files.write(dest.toPath(), bytes); }
}
