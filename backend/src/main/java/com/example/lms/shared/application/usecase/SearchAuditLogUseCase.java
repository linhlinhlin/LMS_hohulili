package com.example.lms.shared.application.usecase;

import com.example.lms.shared.application.dto.AuditLogEntryDto;
import com.example.lms.shared.application.dto.AuditLogQuery;
import com.example.lms.shared.application.port.AuditLogQueryPort;
import com.example.lms.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Use case backing {@code GET /api/v3/admin/audit-logs}. Centralises the
 * date-range and paging validation so the controller stays thin and the
 * business invariants are unit-testable without booting Spring.
 *
 * <p>Validation rules (see issues #187, #188):
 * <ul>
 *   <li>{@code from} must be on or before {@code to}</li>
 *   <li>Window may not exceed 365 days (SOC2 / ISO27001 evidence period)</li>
 *   <li>Window default is the most recent 7 days when neither {@code from}
 *       nor {@code to} is provided</li>
 * </ul>
 *
 * <p>Window semantics are half-open {@code [from, to)} for the same reason as
 * {@link com.example.lms.course_authoring.admin.application.usecase.GetWindowedAnalyticsUseCase}
 * — adjacent ranges must not double-count the boundary instant.
 */
@Component
@RequiredArgsConstructor
public class SearchAuditLogUseCase {

    private static final long MAX_WINDOW_DAYS = 365L;
    private static final long DEFAULT_WINDOW_DAYS = 7L;

    private final AuditLogQueryPort port;
    private final Clock clock;

    public Page<AuditLogEntryDto> execute(AuditLogQuery rawQuery) {
        AuditLogQuery query = rawQuery.normalise();
        AuditLogQuery resolved = applyDefaultWindow(query);
        validateWindow(resolved.from(), resolved.to());
        return port.search(resolved);
    }

    public AuditLogEntryDto getById(Long id) {
        if (id == null || id <= 0) {
            throw new ValidationException("id", "ID nhật ký kiểm toán không hợp lệ");
        }
        return port.findById(id);
    }

    /**
     * Default the window to the most recent 7 days when both bounds are absent.
     * If only one bound is provided we leave it alone — partial filters are
     * still legitimate (e.g. "everything after this date").
     */
    private AuditLogQuery applyDefaultWindow(AuditLogQuery query) {
        if (query.from() != null || query.to() != null) {
            return query;
        }
        Instant now = Instant.now(clock);
        Instant windowStart = now.minus(DEFAULT_WINDOW_DAYS, ChronoUnit.DAYS);
        return new AuditLogQuery(
                query.tableName(),
                query.action(),
                windowStart,
                now,
                query.actorEmail(),
                query.actorName(),
                query.page(),
                query.size()
        );
    }

    private void validateWindow(Instant from, Instant to) {
        if (from == null || to == null) {
            return; // half-bounded windows are allowed
        }
        if (from.isAfter(to)) {
            throw new ValidationException(
                    "from",
                    "Mốc thời gian bắt đầu phải trước hoặc bằng mốc thời gian kết thúc"
            );
        }
        Duration span = Duration.between(from, to);
        if (span.compareTo(Duration.ofDays(MAX_WINDOW_DAYS)) > 0) {
            throw new ValidationException(
                    "to",
                    "Khoảng thời gian không được vượt quá " + MAX_WINDOW_DAYS + " ngày"
            );
        }
    }
}
