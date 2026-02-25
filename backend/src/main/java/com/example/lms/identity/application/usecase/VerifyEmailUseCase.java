package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.repository.EmailVerificationTokenRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.lms.shared.domain.util.HashUtil;

/**
 * Validates email verification token and enables user account.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VerifyEmailUseCase {

    private final EmailVerificationTokenRepository tokenRepository;
    private final UserRepository userRepository;

    @Transactional
    public void execute(String rawToken) {
        String tokenHash = HashUtil.sha256(rawToken);

        var token = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BusinessRuleException("Token xác nhận không hợp lệ hoặc đã hết hạn"));

        if (token.isVerified()) {
            throw new BusinessRuleException("Email đã được xác nhận trước đó");
        }

        if (token.isExpired()) {
            throw new BusinessRuleException("Token xác nhận đã hết hạn. Vui lòng yêu cầu gửi lại.");
        }

        // Mark token as verified
        tokenRepository.markVerifiedByTokenHash(tokenHash);

        // Enable user account
        userRepository.findById(UserId.of(token.getUserId())).ifPresent(user -> {
            user.enable();
            userRepository.save(user);
            log.info("Email verified for user: {}", token.getUserId());
        });
    }

}
