package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.repository.PasswordResetTokenRepository;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Validates reset token and updates user password.
 * Single-use token, immediate invalidation of all tokens for user.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResetPasswordUseCase {

    private final PasswordResetTokenRepository tokenRepository;
    private final UserJpaRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void execute(String rawToken, String newPassword) {
        String tokenHash = RequestPasswordResetUseCase.sha256(rawToken);

        var tokenEntity = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BusinessRuleException("Liên kết đặt lại mật khẩu không hợp lệ"));

        if (tokenEntity.isUsed()) {
            throw new BusinessRuleException("Liên kết đặt lại mật khẩu đã được sử dụng");
        }

        if (tokenEntity.isExpired()) {
            throw new BusinessRuleException("Liên kết đặt lại mật khẩu đã hết hạn");
        }

        // Update user password
        var user = userRepository.findById(tokenEntity.getUserId())
                .orElseThrow(() -> new BusinessRuleException("Người dùng không tồn tại"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark token as used
        tokenEntity.setUsedAt(Instant.now());

        // Delete all other tokens for this user
        tokenRepository.deleteUnusedByUserId(user.getId());

        log.info("Password reset completed for user: {}", user.getId());
    }
}
