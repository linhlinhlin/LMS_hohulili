package com.example.lms.shared.infrastructure.web;

import com.example.lms.shared.application.dto.AuditLogEntryDto;
import com.example.lms.shared.application.dto.AuditLogQuery;
import com.example.lms.shared.application.usecase.SearchAuditLogUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Tag(name = "Audit Logs V3", description = "API nhật ký kiểm toán (chỉ admin)")
@RestController
@RequestMapping("/api/v3/admin/audit-logs")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class AuditLogControllerV3 {

    private final SearchAuditLogUseCase searchAuditLogUseCase;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    @Operation(
            summary = "Lấy danh sách nhật ký kiểm toán (phân trang)",
            description = "Hỗ trợ lọc theo bảng, hành động và khoảng thời gian (from/to ISO-8601, "
                    + "mặc định 7 ngày gần nhất, tối đa 365 ngày)."
    )
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String table,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        AuditLogQuery query = new AuditLogQuery(
                table, action, from, to, null, null, page, size
        );
        Page<AuditLogEntryDto> logs = searchAuditLogUseCase.execute(query);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", logs.getContent().stream().map(this::toMap).toList());
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
        AuditLogEntryDto entry = searchAuditLogUseCase.getById(id);
        return ResponseEntity.ok(ApiResponse.success(toMap(entry), "Chi tiết nhật ký kiểm toán"));
    }

    private Map<String, Object> toMap(AuditLogEntryDto entry) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", entry.id());
        map.put("tableName", entry.tableName());
        map.put("recordId", entry.recordId() != null ? entry.recordId().toString() : null);
        map.put("action", entry.action());
        map.put("oldData", entry.oldData());
        map.put("newData", entry.newData());
        map.put("changedBy", entry.changedBy() != null ? entry.changedBy().toString() : null);
        map.put("changedAt", entry.changedAt() != null ? entry.changedAt().toString() : null);
        return map;
    }
}
