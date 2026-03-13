package com.example.lms.shared.application.usecase;

import com.example.lms.shared.domain.model.PayoutRequest;
import com.example.lms.shared.domain.repository.PayoutRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ProcessPayoutUseCase {

    private final PayoutRequestRepository payoutRepo;

    @Transactional
    public PayoutRequest approve(UUID payoutId, UUID adminId, String adminNote) {
        var request = load(payoutId);
        request.approve(adminId, adminNote);
        return payoutRepo.save(request);
    }

    @Transactional
    public PayoutRequest reject(UUID payoutId, UUID adminId, String adminNote) {
        var request = load(payoutId);
        request.reject(adminId, adminNote);
        return payoutRepo.save(request);
    }

    @Transactional
    public PayoutRequest complete(UUID payoutId, UUID adminId) {
        var request = load(payoutId);
        request.markCompleted(adminId);
        return payoutRepo.save(request);
    }

    private PayoutRequest load(UUID payoutId) {
        return payoutRepo.findById(payoutId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Yêu cầu rút tiền không tồn tại"));
    }
}
