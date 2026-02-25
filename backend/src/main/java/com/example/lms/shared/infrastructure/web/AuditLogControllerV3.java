package com.example.lms.shared.infrastructure.web;

import com.example.lms.shared.infrastructure.persistence.AuditLogJpaRepository;
import com.example.lms.shared.infrastructure.persistence.entity.AuditLogJpaEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@Tag(name = "Audit Logs V3", description = "API nhật ký kiểm toán (chỉ admin)")
@RestController
@RequestMapping("/api/v3/admin/audit-logs")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class AuditLogControllerV3 {

    private final AuditLogJpaRepository auditLogRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Lấy danh sách nhật ký kiểm toán (phân trang)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String table,
            @RequestParam(required = false) String action) {

        Page<AuditLogJpaEntity> logs = auditLogRepository.findFiltered(
                table, action, PageRequest.of(page, Math.min(size, 100)));

        var content = logs.getContent().stream().map(this::toMap).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", content);
        result.put("page", logs.getNumber());
        result.put("size", logs.getSize());
        result.put("totalElements", logs.getTotalElements());
        result.put("totalPages", logs.getTotalPages());

        return ResponseEntity.ok(ApiResponse.success(result, "Tải nhật ký kiểm toán thành công"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Xem chi tiết nhật ký kiểm toán")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAuditLogDetail(@PathVariable Long id) {
        return auditLogRepository.findById(id)
                .map(entry -> ResponseEntity.ok(ApiResponse.success(toMap(entry))))
                .orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> toMap(AuditLogJpaEntity entry) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", entry.getId());
        map.put("tableName", entry.getTableName());
        map.put("recordId", entry.getRecordId() != null ? entry.getRecordId().toString() : null);
        map.put("action", entry.getAction());
        map.put("oldData", entry.getOldData());
        map.put("newData", entry.getNewData());
        map.put("changedBy", entry.getChangedBy() != null ? entry.getChangedBy().toString() : null);
        map.put("changedAt", entry.getChangedAt() != null ? entry.getChangedAt().toString() : null);
        return map;
    }
}
