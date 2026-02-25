package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.repository.PasswordResetTokenRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.identity.domain.valueobject.PasswordPolicy;
import com.example.lms.shared.domain.util.HashUtil;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Validates reset token and updates user password.
 * Single-use token, immediate invalidation of all tokens for user.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResetPasswordUseCase {

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void execute(String rawToken, String newPassword) {
        String tokenHash = HashUtil.sha256(rawToken);

        var token = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BusinessRuleException("Liên kết đặt lại mật khẩu không hợp lệ"));

        if (token.isUsed()) {
            throw new BusinessRuleException("Liên kết đặt lại mật khẩu đã được sử dụng");
        }

        if (token.isExpired()) {
            throw new BusinessRuleException("Liên kết đặt lại mật khẩu đã hết hạn");
        }

        // Validate new password (NIST 800-63B-4)
        String policyError = PasswordPolicy.validate(newPassword);
        if (policyError != null) {
            throw new BusinessRuleException(policyError);
        }

        // Update user password via domain model
        var user = userRepository.findById(UserId.of(token.getUserId()))
                .orElseThrow(() -> new BusinessRuleException("Người dùng không tồn tại"));

        user.changePassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark token as used (persisted via port)
        tokenRepository.markUsedByTokenHash(tokenHash);

        // Delete all other tokens for this user
        tokenRepository.deleteUnusedByUserId(token.getUserId());

        log.info("Password reset completed for user: {}", token.getUserId());
    }
}
