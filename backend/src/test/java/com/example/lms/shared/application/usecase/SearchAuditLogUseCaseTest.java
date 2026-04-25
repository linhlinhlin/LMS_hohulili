package com.example.lms.shared.application.usecase;

import com.example.lms.shared.application.dto.AuditLogEntryDto;
import com.example.lms.shared.application.dto.AuditLogQuery;
import com.example.lms.shared.application.port.AuditLogQueryPort;
import com.example.lms.shared.exception.ValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SearchAuditLogUseCase Tests")
class SearchAuditLogUseCaseTest {

    private static final Instant NOW = Instant.parse("2026-04-25T00:00:00Z");

    @Mock private AuditLogQueryPort port;

    private SearchAuditLogUseCase useCase;

    @BeforeEach
    void setUp() {
        Clock fixed = Clock.fixed(NOW, ZoneOffset.UTC);
        useCase = new SearchAuditLogUseCase(port, fixed);
    }

    @Nested
    @DisplayName("Default window (7 days)")
    class DefaultWindowTests {

        @Test
        @DisplayName("When neither from nor to provided, defaults to last 7 days [now-7d, now)")
        void appliesDefaultWindowWhenBothBoundsAbsent() {
            stubEmptyPage();

            useCase.execute(new AuditLogQuery(null, null, null, null, null, null, 0, 20));

            ArgumentCaptor<AuditLogQuery> captor = ArgumentCaptor.forClass(AuditLogQuery.class);
            verify(port).search(captor.capture());
            AuditLogQuery resolved = captor.getValue();
            assertThat(resolved.from()).isEqualTo(NOW.minus(7, ChronoUnit.DAYS));
            assertThat(resolved.to()).isEqualTo(NOW);
        }

        @Test
        @DisplayName("When only 'from' provided, does not auto-fill 'to'")
        void preservesPartialFromOnly() {
            stubEmptyPage();
            Instant from = NOW.minus(30, ChronoUnit.DAYS);

            useCase.execute(new AuditLogQuery(null, null, from, null, null, null, 0, 20));

            ArgumentCaptor<AuditLogQuery> captor = ArgumentCaptor.forClass(AuditLogQuery.class);
            verify(port).search(captor.capture());
            assertThat(captor.getValue().from()).isEqualTo(from);
            assertThat(captor.getValue().to()).isNull();
        }

        @Test
        @DisplayName("When only 'to' provided, does not auto-fill 'from'")
        void preservesPartialToOnly() {
            stubEmptyPage();
            Instant to = NOW;

            useCase.execute(new AuditLogQuery(null, null, null, to, null, null, 0, 20));

            ArgumentCaptor<AuditLogQuery> captor = ArgumentCaptor.forClass(AuditLogQuery.class);
            verify(port).search(captor.capture());
            assertThat(captor.getValue().from()).isNull();
            assertThat(captor.getValue().to()).isEqualTo(to);
        }
    }

    @Nested
    @DisplayName("Date range validation")
    class DateRangeValidationTests {

        @Test
        @DisplayName("Rejects 'from' after 'to'")
        void rejectsFromAfterTo() {
            Instant from = NOW;
            Instant to = NOW.minus(1, ChronoUnit.DAYS);

            assertThatThrownBy(() ->
                    useCase.execute(new AuditLogQuery(null, null, from, to, null, null, 0, 20)))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("trước hoặc bằng");

            verify(port, never()).search(any());
        }

        @Test
        @DisplayName("Accepts 'from' equal to 'to' (zero-width window)")
        void acceptsFromEqualToTo() {
            stubEmptyPage();

            useCase.execute(new AuditLogQuery(null, null, NOW, NOW, null, null, 0, 20));

            verify(port).search(any());
        }

        @Test
        @DisplayName("Rejects window > 365 days")
        void rejectsWindowOver365Days() {
            Instant from = NOW.minus(366, ChronoUnit.DAYS);
            Instant to = NOW;

            assertThatThrownBy(() ->
                    useCase.execute(new AuditLogQuery(null, null, from, to, null, null, 0, 20)))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("365");
        }

        @Test
        @DisplayName("Accepts window exactly 365 days")
        void acceptsWindowExactly365Days() {
            stubEmptyPage();
            Instant from = NOW.minus(365, ChronoUnit.DAYS);

            useCase.execute(new AuditLogQuery(null, null, from, NOW, null, null, 0, 20));

            verify(port).search(any());
        }
    }

    @Nested
    @DisplayName("Query normalisation")
    class QueryNormalisationTests {

        @Test
        @DisplayName("Page size > 100 is clamped to 100")
        void clampsPageSize() {
            stubEmptyPage();

            useCase.execute(new AuditLogQuery(null, null, null, null, null, null, 0, 999));

            ArgumentCaptor<AuditLogQuery> captor = ArgumentCaptor.forClass(AuditLogQuery.class);
            verify(port).search(captor.capture());
            assertThat(captor.getValue().size()).isEqualTo(100);
        }

        @Test
        @DisplayName("Negative page is normalised to 0")
        void normalisesNegativePage() {
            stubEmptyPage();

            useCase.execute(new AuditLogQuery(null, null, null, null, null, null, -5, 20));

            ArgumentCaptor<AuditLogQuery> captor = ArgumentCaptor.forClass(AuditLogQuery.class);
            verify(port).search(captor.capture());
            assertThat(captor.getValue().page()).isEqualTo(0);
        }

        @Test
        @DisplayName("Blank filter strings normalised to null so adapter sees a single 'absent' representation")
        void blankStringsBecomeNull() {
            stubEmptyPage();

            useCase.execute(new AuditLogQuery("  ", "", null, null, "", "  ", 0, 20));

            ArgumentCaptor<AuditLogQuery> captor = ArgumentCaptor.forClass(AuditLogQuery.class);
            verify(port).search(captor.capture());
            AuditLogQuery sent = captor.getValue();
            assertThat(sent.tableName()).isNull();
            assertThat(sent.action()).isNull();
            assertThat(sent.actorEmail()).isNull();
            assertThat(sent.actorName()).isNull();
        }

        @Test
        @DisplayName("Non-blank filters preserved verbatim")
        void preservesFilters() {
            stubEmptyPage();

            useCase.execute(new AuditLogQuery("courses", "UPDATE", null, null, "admin@", "Admin Nguyen", 0, 20));

            ArgumentCaptor<AuditLogQuery> captor = ArgumentCaptor.forClass(AuditLogQuery.class);
            verify(port).search(captor.capture());
            AuditLogQuery sent = captor.getValue();
            assertThat(sent.tableName()).isEqualTo("courses");
            assertThat(sent.action()).isEqualTo("UPDATE");
            assertThat(sent.actorEmail()).isEqualTo("admin@");
            assertThat(sent.actorName()).isEqualTo("Admin Nguyen");
        }
    }

    @Nested
    @DisplayName("getById")
    class GetByIdTests {

        @Test
        @DisplayName("Rejects null id")
        void rejectsNullId() {
            assertThatThrownBy(() -> useCase.getById(null))
                    .isInstanceOf(ValidationException.class);
        }

        @Test
        @DisplayName("Rejects non-positive id")
        void rejectsZeroAndNegativeId() {
            assertThatThrownBy(() -> useCase.getById(0L)).isInstanceOf(ValidationException.class);
            assertThatThrownBy(() -> useCase.getById(-1L)).isInstanceOf(ValidationException.class);
        }

        @Test
        @DisplayName("Delegates to port for valid id")
        void delegatesToPort() {
            AuditLogEntryDto dto = new AuditLogEntryDto(
                    42L, "courses", null, "UPDATE", null, null, null, null, null, NOW);
            when(port.findById(42L)).thenReturn(dto);

            assertThat(useCase.getById(42L)).isSameAs(dto);
        }
    }

    private void stubEmptyPage() {
        when(port.search(any())).thenReturn(new PageImpl<>(List.of()));
    }
}
