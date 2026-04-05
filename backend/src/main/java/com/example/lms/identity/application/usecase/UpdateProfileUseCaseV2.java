package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.UpdateProfileCommand;
import com.example.lms.identity.application.dto.UserResponse;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for updating user profile using DDD domain models.
 */
@Service("updateProfileUseCaseV2")
@RequiredArgsConstructor
@Slf4j
public class UpdateProfileUseCaseV2 {

    @Qualifier("newUserRepositoryAdapter")
    private final UserRepository userRepository;

    @Transactional
    public UserResponse execute(UUID userId, UpdateProfileCommand command) {
        log.info("Updating profile for user (V2): {}", userId);

        User user = userRepository.findById(UserId.of(userId))
            .orElseThrow(() -> new EntityNotFoundException("User", userId));

        // Check email uniqueness if changed
        String currentEmail = user.getEmail() != null ? user.getEmail().getValue() : null;
        if (command.email() != null && !command.email().equals(currentEmail)) {
            if (userRepository.existsByEmail(command.email())) {
                throw new ValidationException("email", "Email đã tồn tại");
            }
        }

        // Update profile using domain model's business method
        Email newEmail = command.email() != null ? Email.of(command.email()) : user.getEmail();
        String newFullName = command.fullName() != null ? command.fullName() : user.getFullName();
        user.updateProfile(newFullName, newEmail);

        if (command.avatarUrl() != null) {
            user.updateAvatarUrl(command.avatarUrl());
        }

        // Save updated user
        User updatedUser = userRepository.save(user);

        log.info("Profile updated successfully (V2) for user: {}", userId);

        return UserResponse.fromDomain(updatedUser);
    }
}
