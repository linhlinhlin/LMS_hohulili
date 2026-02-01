package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.UserResponse;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Use case for getting current user info using DDD domain models.
 */
@Service("getCurrentUserUseCaseV2")
@RequiredArgsConstructor
@Slf4j
public class GetCurrentUserUseCaseV2 {

    @Qualifier("newUserRepositoryAdapter")
    private final UserRepository userRepository;

    public UserResponse execute(UUID userId) {
        log.debug("Getting current user (V2): {}", userId);

        User user = userRepository.findById(UserId.of(userId))
            .orElseThrow(() -> new EntityNotFoundException("User", userId));

        return UserResponse.fromDomain(user);
    }
}
