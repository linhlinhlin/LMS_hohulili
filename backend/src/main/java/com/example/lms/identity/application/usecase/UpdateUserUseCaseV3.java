package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.UserId;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Use case for updating user details (admin operation).
 * V3 - Uses domain repository and model only.
 */
@Service
@RequiredArgsConstructor
public class UpdateUserUseCaseV3 {

    private static final Logger log = LoggerFactory.getLogger(UpdateUserUseCaseV3.class);

    private final UserRepository userRepository;

    @Transactional
    public Optional<User> execute(UUID userId, Command command) {
        log.info("Updating user {}", userId);

        return userRepository.findById(UserId.of(userId))
                .map(user -> {
                    if (command.fullName() != null) {
                        user.updateProfile(command.fullName(), user.getEmail());
                    }
                    if (command.role() != null) {
                        try {
                            Role newRole = Role.valueOf(command.role().toUpperCase());
                            user.changeRole(newRole);
                        } catch (IllegalArgumentException e) {
                            log.warn("Invalid role '{}' for user {}, ignoring", command.role(), userId);
                        }
                    }
                    if (command.enabled() != null) {
                        if (command.enabled()) {
                            user.enable();
                        } else {
                            user.disable();
                        }
                    }
                    User saved = userRepository.save(user);
                    log.info("User {} updated successfully", userId);
                    return saved;
                });
    }

    public record Command(
            String fullName,
            String role,
            Boolean enabled
    ) {}
}
