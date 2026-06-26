package com.example.lms.shared.application.usecase;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.application.port.LearningPackageRevenuePort;
import com.example.lms.shared.application.support.BankAccountMasking;
import com.example.lms.shared.domain.model.PayoutRequest;
import com.example.lms.shared.domain.model.RevenueSplit;
import com.example.lms.shared.domain.model.TeacherBankAccount;
import com.example.lms.shared.domain.repository.PayoutRequestRepository;
import com.example.lms.shared.domain.repository.RevenueSplitRepository;
import com.example.lms.shared.domain.repository.TeacherBankAccountRepository;
import com.example.lms.shared.infrastructure.service.RevenueConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class GetTeacherRevenueUseCase {

    private final RevenueSplitRepository        revenueSplitRepository;
    private final PayoutRequestRepository       payoutRequestRepository;
    private final TeacherBankAccountRepository  bankAccountRepository;
    private final JpaCourseRepository           courseRepository;
    private final UserJpaRepository             userRepository;
    private final RevenueConfigService          revenueConfigService;
    private final LearningPackageRevenuePort    learningPackageRevenuePort;

    // ── DTOs ─────────────────────────────────────────────────────────────

    public record RevenueSummaryDto(
            BigDecimal totalRevenue,
            BigDecimal thisMonthRevenue,
            BigDecimal lastMonthRevenue,
            double     growthPercentage,
            long       totalCoursesSold
    ) {}

    public record RevenueSplitDto(
            UUID       id,
            UUID       paymentId,
            UUID       courseId,
            String     courseName,
            String     studentName,
            BigDecimal grossAmount,
            BigDecimal platformFeePct,
            BigDecimal teacherSharePct,
            BigDecimal platformAmount,
            BigDecimal teacherAmount,
            Instant    createdAt
    ) {}

    public record PayoutBalanceDto(
            BigDecimal availableBalance,
            BigDecimal pendingBalance,
            BigDecimal totalWithdrawn,
            BigDecimal minPayoutAmount
    ) {}

    public record PayoutHistoryDto(
            UUID       id,
            BigDecimal amount,
            String     status,
            String     teacherNote,
            String     adminNote,
            Instant    requestedAt,
            Instant    processedAt,
            UUID       bankAccountId,
            String     bankCode,
            String     accountNumberMasked
    ) {}

    // ── Methods ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RevenueSummaryDto getSummary(UUID teacherId) {
        BigDecimal total     = sumRevenue(
                revenueSplitRepository.sumTeacherAmountByTeacherId(teacherId),
                learningPackageRevenuePort.sumTeacherAmountByTeacherId(teacherId));
        BigDecimal thisMonth = sumRevenue(
                revenueSplitRepository.sumTeacherAmountThisMonth(teacherId),
                learningPackageRevenuePort.sumTeacherAmountThisMonth(teacherId));
        BigDecimal lastMonth = sumRevenue(
                revenueSplitRepository.sumTeacherAmountLastMonth(teacherId),
                learningPackageRevenuePort.sumTeacherAmountLastMonth(teacherId));
        long       sold      = revenueSplitRepository.countDistinctCoursesByTeacherId(teacherId);

        double growth = 0.0;
        if (lastMonth.compareTo(BigDecimal.ZERO) > 0) {
            growth = thisMonth.subtract(lastMonth)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(lastMonth, 1, RoundingMode.HALF_UP)
                    .doubleValue();
        }
        return new RevenueSummaryDto(total, thisMonth, lastMonth, growth, sold);
    }

    @Transactional(readOnly = true)
    public Page<RevenueSplitDto> getHistory(UUID teacherId, int page, int size) {
        Page<RevenueSplit> splits = revenueSplitRepository.findByTeacherId(
                teacherId, PageRequest.of(page, size));

        // Batch-load course titles
        List<UUID> courseIds = splits.stream().map(RevenueSplit::getCourseId).distinct().toList();
        Map<UUID, String> courseTitles = courseRepository.findAllById(courseIds)
                .stream().collect(Collectors.toMap(c -> c.getId(), c -> c.getTitle()));

        return splits.map(s -> new RevenueSplitDto(
                s.getId(), s.getPaymentId(), s.getCourseId(),
                courseTitles.getOrDefault(s.getCourseId(), "—"),
                "—",   // student name not stored in split (privacy)
                s.getGrossAmount(), s.getPlatformFeePct(), s.getTeacherSharePct(),
                s.getPlatformAmount(), s.getTeacherAmount(), s.getCreatedAt()
        ));
    }

    @Transactional(readOnly = true)
    public Page<PayoutHistoryDto> getPayoutHistory(UUID teacherId, int page, int size) {
        Page<PayoutRequest> requests = payoutRequestRepository.findByTeacherId(
                teacherId, PageRequest.of(page, size));

        // Build bank account lookup map for this page
        List<UUID> bankAccountIds = requests.stream()
                .map(PayoutRequest::getBankAccountId)
                .distinct().toList();
        Map<UUID, TeacherBankAccount> bankAccounts = bankAccountRepository.findByIds(bankAccountIds).stream()
                .collect(Collectors.toMap(TeacherBankAccount::getId, account -> account));

        return requests.map(p -> {
            TeacherBankAccount acct = bankAccounts.get(p.getBankAccountId());
            String bankCode = acct != null ? acct.getBankCode() : "—";
            String num      = acct != null ? acct.getAccountNumber() : "";
            String masked   = BankAccountMasking.mask(num);
            return new PayoutHistoryDto(
                    p.getId(), p.getAmount(), p.getStatus().name(),
                    p.getTeacherNote(), p.getAdminNote(),
                    p.getRequestedAt(), p.getProcessedAt(),
                    p.getBankAccountId(), bankCode, masked);
        });
    }

    @Transactional(readOnly = true)
    public PayoutBalanceDto getBalance(UUID teacherId) {
        BigDecimal totalEarned  = sumRevenue(
                revenueSplitRepository.sumTeacherAmountByTeacherId(teacherId),
                learningPackageRevenuePort.sumTeacherAmountByTeacherId(teacherId));
        BigDecimal completed    = payoutRequestRepository.sumCompletedByTeacherId(teacherId);
        BigDecimal inFlight     = payoutRequestRepository.sumPendingAndApprovedByTeacherId(teacherId);
        BigDecimal available    = totalEarned.subtract(completed).subtract(inFlight);
        if (available.compareTo(BigDecimal.ZERO) < 0) available = BigDecimal.ZERO;

        UUID orgId = userRepository.findById(teacherId)
                .map(u -> u.getOrganizationId()).orElse(null);
        BigDecimal minPayout = revenueConfigService.resolveConfig(orgId).getMinPayoutAmount();

        return new PayoutBalanceDto(available, inFlight, completed, minPayout);
    }

    private BigDecimal sumRevenue(BigDecimal courseRevenue, BigDecimal packageRevenue) {
        return zeroIfNull(courseRevenue).add(zeroIfNull(packageRevenue));
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
