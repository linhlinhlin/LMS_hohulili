package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.AssignmentDTOs.CreateInstructionAttachmentRequest;
import com.example.lms.assessment.application.dto.AssignmentDTOs.InstructionAttachment;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAttachmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAttachmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Use case quản lý instruction attachments của assignment (teacher upload
 * standalone PDF/Word/sample dính kèm bài tập).
 *
 * <p>Pattern Google Classroom: instructions hỗ trợ cả rich-text inline
 * (Tiptap) và standalone file attachments. FE/Controller filter qua
 * {@code submission_id IS NULL} để phân biệt với student submission files.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ManageAssignmentInstructionAttachmentsUseCase {

    private final AssignmentJpaRepository assignmentRepository;
    private final AssignmentAttachmentJpaRepository attachmentRepository;

    @Transactional
    public InstructionAttachment add(UUID assignmentId, UUID uploaderId, CreateInstructionAttachmentRequest req) {
        if (!assignmentRepository.existsById(assignmentId)) {
            throw new EntityNotFoundException("Bài tập", assignmentId);
        }

        int order = req.getDisplayOrder() != null
                ? req.getDisplayOrder()
                : nextOrder(assignmentId);

        AssignmentAttachmentJpaEntity saved = attachmentRepository.save(
                AssignmentAttachmentJpaEntity.builder()
                        .assignmentId(assignmentId)
                        .submissionId(null)  // marker: instruction attachment
                        .fileName(req.getFileName())
                        .fileUrl(req.getFileUrl())
                        .storageKey(req.getStorageKey())
                        .fileSize(req.getFileSize())
                        .fileType(req.getFileType())
                        .displayOrder(order)
                        .uploadedBy(uploaderId)
                        .build()
        );

        log.info("Đã thêm instruction attachment {} vào assignment {}", saved.getId(), assignmentId);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<InstructionAttachment> list(UUID assignmentId) {
        return attachmentRepository
                .findByAssignmentIdAndSubmissionIdIsNullOrderByDisplayOrderAscUploadedAtAsc(assignmentId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public void delete(UUID assignmentId, UUID attachmentId) {
        AssignmentAttachmentJpaEntity attachment = attachmentRepository
                .findByIdAndSubmissionIdIsNull(attachmentId)
                .orElseThrow(() -> new EntityNotFoundException("Tệp đính kèm", attachmentId));

        if (!attachment.getAssignmentId().equals(assignmentId)) {
            // Defense-in-depth: ngăn cross-assignment delete dù URL đoán đúng UUID
            throw new EntityNotFoundException("Tệp đính kèm", attachmentId);
        }

        attachmentRepository.delete(attachment);
        log.info("Đã xóa instruction attachment {} khỏi assignment {}", attachmentId, assignmentId);
    }

    private int nextOrder(UUID assignmentId) {
        return attachmentRepository
                .findByAssignmentIdAndSubmissionIdIsNullOrderByDisplayOrderAscUploadedAtAsc(assignmentId)
                .stream()
                .map(AssignmentAttachmentJpaEntity::getDisplayOrder)
                .max(Comparator.naturalOrder())
                .map(max -> max + 1)
                .orElse(0);
    }

    private InstructionAttachment toDto(AssignmentAttachmentJpaEntity entity) {
        return InstructionAttachment.builder()
                .id(entity.getId().toString())
                .fileName(entity.getFileName())
                .fileUrl(entity.getFileUrl())
                .fileSize(entity.getFileSize())
                .fileType(entity.getFileType())
                .storageKey(entity.getStorageKey())
                .displayOrder(entity.getDisplayOrder())
                .uploadedAt(entity.getUploadedAt() != null ? entity.getUploadedAt().toString() : null)
                .build();
    }
}
