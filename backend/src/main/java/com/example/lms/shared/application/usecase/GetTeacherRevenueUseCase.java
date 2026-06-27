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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
            Instant    createdAt,
            String     source
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

    @Transactional(readOnly = true)
    public RevenueSummaryDto getSummary(UUID teacherId) {
        BigDecimal total = sumRevenue(
                revenueSplitRepository.sumTeacherAmountByTeacherId(teacherId),
                learningPackageRevenuePort.sumTeacherAmountByTeacherId(teacherId));
        BigDecimal thisMonth = sumRevenue(
                revenueSplitRepository.sumTeacherAmountThisMonth(teacherId),
                learningPackageRevenuePort.sumTeacherAmountThisMonth(teacherId));
        BigDecimal lastMonth = sumRevenue(
                revenueSplitRepository.sumTeacherAmountLastMonth(teacherId),
                learningPackageRevenuePort.sumTeacherAmountLastMonth(teacherId));
        long sold = countDistinctRevenueCourses(teacherId);

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
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        long offset = (long) safePage * safeSize;
        int fetchSize = (int) Math.min(Integer.MAX_VALUE, offset + safeSize);
        var sourceWindow = PageRequest.of(0, fetchSize);
        var targetPage = PageRequest.of(safePage, safeSize);

        Page<RevenueSplit> courseSplits = revenueSplitRepository.findByTeacherId(teacherId, sourceWindow);
        Page<LearningPackageRevenuePort.TeacherRevenueLine> packageSplits =
                learningPackageRevenuePort.findTeacherRevenueLines(teacherId, sourceWindow);

        Map<UUID, String> courseTitles = loadCourseTitles(courseSplits, packageSplits);
        List<RevenueSplitDto> history = new ArrayList<>();
        history.addAll(courseSplits.stream()
                .map(split -> toCourseRevenueDto(split, courseTitles))
                .toList());
        history.addAll(packageSplits.stream()
                .map(split -> toPackageRevenueDto(split, courseTitles))
                .toList());

        List<RevenueSplitDto> content = history.stream()
                .sorted(Comparator.comparing(RevenueSplitDto::createdAt).reversed())
                .skip(offset)
                .limit(safeSize)
                .toList();

        long total = courseSplits.getTotalElements() + packageSplits.getTotalElements();
        return new PageImpl<>(content, targetPage, total);
    }

    @Transactional(readOnly = true)
    public Page<PayoutHistoryDto> getPayoutHistory(UUID teacherId, int page, int size) {
        Page<PayoutRequest> requests = payoutRequestRepository.findByTeacherId(
                teacherId, PageRequest.of(page, size));

        List<UUID> bankAccountIds = requests.stream()
                .map(PayoutRequest::getBankAccountId)
                .distinct()
                .toList();
        Map<UUID, TeacherBankAccount> bankAccounts = bankAccountRepository.findByIds(bankAccountIds).stream()
                .collect(Collectors.toMap(TeacherBankAccount::getId, account -> account));

        return requests.map(payout -> {
            TeacherBankAccount account = bankAccounts.get(payout.getBankAccountId());
            String bankCode = account != null ? account.getBankCode() : "-";
            String accountNumber = account != null ? account.getAccountNumber() : "";
            return new PayoutHistoryDto(
                    payout.getId(),
                    payout.getAmount(),
                    payout.getStatus().name(),
                    payout.getTeacherNote(),
                    payout.getAdminNote(),
                    payout.getRequestedAt(),
                    payout.getProcessedAt(),
                    payout.getBankAccountId(),
                    bankCode,
                    BankAccountMasking.mask(accountNumber));
        });
    }

    @Transactional(readOnly = true)
    public PayoutBalanceDto getBalance(UUID teacherId) {
        BigDecimal totalEarned = sumRevenue(
                revenueSplitRepository.sumTeacherAmountByTeacherId(teacherId),
                learningPackageRevenuePort.sumTeacherAmountByTeacherId(teacherId));
        BigDecimal completed = payoutRequestRepository.sumCompletedByTeacherId(teacherId);
        BigDecimal inFlight = payoutRequestRepository.sumPendingAndApprovedByTeacherId(teacherId);
        BigDecimal available = totalEarned.subtract(completed).subtract(inFlight);
        if (available.compareTo(BigDecimal.ZERO) < 0) {
            available = BigDecimal.ZERO;
        }

        UUID orgId = userRepository.findById(teacherId)
                .map(user -> user.getOrganizationId())
                .orElse(null);
        BigDecimal minPayout = revenueConfigService.resolveConfig(orgId).getMinPayoutAmount();

        return new PayoutBalanceDto(available, inFlight, completed, minPayout);
    }

    private Map<UUID, String> loadCourseTitles(
            Page<RevenueSplit> courseSplits,
            Page<LearningPackageRevenuePort.TeacherRevenueLine> packageSplits) {
        List<UUID> courseIds = new ArrayList<>();
        courseIds.addAll(courseSplits.stream().map(RevenueSplit::getCourseId).distinct().toList());
        courseIds.addAll(packageSplits.stream()
                .map(LearningPackageRevenuePort.TeacherRevenueLine::courseId)
                .distinct()
                .toList());
        return courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(course -> course.getId(), course -> course.getTitle()));
    }

    private RevenueSplitDto toCourseRevenueDto(RevenueSplit split, Map<UUID, String> courseTitles) {
        return new RevenueSplitDto(
                split.getId(),
                split.getPaymentId(),
                split.getCourseId(),
                courseTitles.getOrDefault(split.getCourseId(), "-"),
                "-",
                split.getGrossAmount(),
                split.getPlatformFeePct(),
                split.getTeacherSharePct(),
                split.getPlatformAmount(),
                split.getTeacherAmount(),
                split.getCreatedAt(),
                "COURSE");
    }

    private RevenueSplitDto toPackageRevenueDto(
            LearningPackageRevenuePort.TeacherRevenueLine split,
            Map<UUID, String> courseTitles) {
        return new RevenueSplitDto(
                split.id(),
                null,
                split.courseId(),
                packageCourseLabel(courseTitles.get(split.courseId())),
                "-",
                split.grossAmount(),
                split.platformFeePct(),
                split.teacherSharePct(),
                split.platformAmount(),
                split.teacherAmount(),
                split.createdAt(),
                "PACKAGE");
    }

    private String packageCourseLabel(String courseTitle) {
        return courseTitle == null || courseTitle.isBlank()
                ? "Gói học"
                : courseTitle + " (Gói học)";
    }

    private BigDecimal sumRevenue(BigDecimal courseRevenue, BigDecimal packageRevenue) {
        return zeroIfNull(courseRevenue).add(zeroIfNull(packageRevenue));
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private long countDistinctRevenueCourses(UUID teacherId) {
        Set<UUID> courseIds = new HashSet<>();
        courseIds.addAll(listOrEmpty(revenueSplitRepository.findDistinctCourseIdsByTeacherId(teacherId)));
        courseIds.addAll(listOrEmpty(learningPackageRevenuePort.findDistinctCourseIdsByTeacherId(teacherId)));
        return courseIds.size();
    }

    private List<UUID> listOrEmpty(List<UUID> values) {
        return values == null ? List.of() : values;
    }
}
