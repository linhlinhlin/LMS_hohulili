package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for changing user password using DDD domain models.
 */
@Service("changePasswordUseCaseV2")
@RequiredArgsConstructor
@Slf4j
public class ChangePasswordUseCaseV2 {

    @Qualifier("newUserRepositoryAdapter")
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void execute(UUID userId, String currentPassword, String newPassword) {
        log.info("Changing password for user (V2): {}", userId);

        User user = userRepository.findById(UserId.of(userId))
            .orElseThrow(() -> new EntityNotFoundException("User", userId));

        // Verify current password
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new ValidationException("currentPassword", "Mật khẩu hiện tại không đúng");
        }

        // Validate new password
        if (newPassword == null || newPassword.length() < 6) {
            throw new ValidationException("newPassword", "Mật khẩu mới phải có ít nhất 6 ký tự");
        }

        // Change password using domain model's business method
        String encodedNewPassword = passwordEncoder.encode(newPassword);
        user.changePassword(encodedNewPassword);

        // Save updated user
        userRepository.save(user);

        log.info("Password changed successfully (V2) for user: {}", userId);
    }
}
