package com.example.lms.shared.application.port;

import com.example.lms.shared.application.dto.AuditLogEntryDto;
import com.example.lms.shared.application.dto.AuditLogQuery;
import org.springframework.data.domain.Page;

/**
 * Port (application-layer interface) exposing read-only access to the audit
 * log. The use case relies on this so it never touches JPA types directly,
 * keeping the layer compliant with CLAUDE.md Clean Architecture rules.
 */
public interface AuditLogQueryPort {

    Page<AuditLogEntryDto> search(AuditLogQuery query);

    AuditLogEntryDto findById(Long id);
}
