package com.example.lms.shared.application.usecase;

import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.domain.model.PayoutRequest;
import com.example.lms.shared.domain.repository.PayoutRequestRepository;
import com.example.lms.shared.domain.repository.RevenueSplitRepository;
import com.example.lms.shared.domain.repository.TeacherBankAccountRepository;
import com.example.lms.shared.infrastructure.service.RevenueConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RequestPayoutUseCase {

    private final PayoutRequestRepository    payoutRepo;
    private final RevenueSplitRepository     splitRepo;
    private final TeacherBankAccountRepository bankRepo;
    private final UserJpaRepository          userRepo;
    private final RevenueConfigService       revenueConfigService;

    @Transactional
    public PayoutRequest execute(UUID teacherId, UUID bankAccountId,
                                  BigDecimal amount, String teacherNote) {
        // Verify bank account belongs to teacher and is verified
        var account = bankRepo.findById(bankAccountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Tài khoản ngân hàng không tồn tại"));
        if (!account.getTeacherId().equals(teacherId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền truy cập");
        }
        if (!account.isVerified()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tài khoản ngân hàng chưa được xác minh. Vui lòng liên hệ admin.");
        }

        // Resolve min payout
        UUID orgId = userRepo.findById(teacherId).map(u -> u.getOrganizationId()).orElse(null);
        BigDecimal minPayout = revenueConfigService.resolveConfig(orgId).getMinPayoutAmount();
        if (amount.compareTo(minPayout) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Số tiền rút tối thiểu là " + minPayout.toPlainString() + "đ");
        }

        // Compute available balance
        BigDecimal totalEarned = splitRepo.sumTeacherAmountByTeacherId(teacherId);
        BigDecimal completed   = payoutRepo.sumCompletedByTeacherId(teacherId);
        BigDecimal inFlight    = payoutRepo.sumPendingAndApprovedByTeacherId(teacherId);
        BigDecimal available   = totalEarned.subtract(completed).subtract(inFlight);

        if (amount.compareTo(available) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Số tiền rút vượt quá số dư khả dụng (" + available.toPlainString() + "đ)");
        }

        var request = PayoutRequest.create(teacherId, bankAccountId, amount, teacherNote);
        return payoutRepo.save(request);
    }
}
