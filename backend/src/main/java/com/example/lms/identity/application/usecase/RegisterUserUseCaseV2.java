package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.AuthResponse;
import com.example.lms.identity.application.dto.RegisterUserCommand;
import com.example.lms.identity.application.dto.UserResponse;
import com.example.lms.identity.domain.event.UserRegisteredEvent;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.identity.infrastructure.security.JwtTokenAdapter;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.exception.ValidationException;
import com.example.lms.shared.infrastructure.event.DomainEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Use case for registering a new user using DDD domain models.
 * 
 * This is the CLEAN version that uses:
 * - Domain model (User) instead of JPA entity
 * - Domain repository (UserRepository) instead of legacy UserDomainRepository
 * - Domain events for cross-module communication
 * 
 * Following Clean Architecture / Hexagonal Architecture principles.
 */
@Service("registerUserUseCaseV2")
@RequiredArgsConstructor
@Slf4j
public class RegisterUserUseCaseV2 {

    @Qualifier("newUserRepositoryAdapter")
    private final UserRepository userRepository;
    private final JwtTokenAdapter jwtTokenAdapter;
    private final PasswordEncoder passwordEncoder;
    private final DomainEventPublisher eventPublisher;

    @Transactional
    public AuthResponse execute(RegisterUserCommand command) {
        log.info("Registering new user (V2): {}", command.username());

        // Validate uniqueness using domain repository
        if (userRepository.existsByUsername(command.username())) {
            throw new ValidationException("username", "Username đã tồn tại");
        }

        if (userRepository.existsByEmail(command.email())) {
            throw new ValidationException("email", "Email đã tồn tại");
        }

        // Determine role
        Role role = Role.STUDENT;
        if (command.role() != null) {
            try {
                role = Role.valueOf(command.role().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new ValidationException("role", "Role không hợp lệ");
            }
        }

        // Create domain user using factory method
        String encodedPassword = passwordEncoder.encode(command.password());
        User user = User.createNew(
            command.username(),
            Email.of(command.email()),
            encodedPassword,
            command.fullName(),
            role
        );

        // Save using domain repository
        User savedUser = userRepository.save(user);

        // Generate tokens using adapter
        String accessToken = jwtTokenAdapter.generateAccessToken(savedUser);
        String refreshToken = jwtTokenAdapter.generateRefreshToken(savedUser);

        log.info("User registered successfully (V2): {}", savedUser.getId());

        // Publish domain event
        eventPublisher.publish(new UserRegisteredEvent(
            savedUser.getId(),
            savedUser.getUsername(),
            savedUser.getEmail() != null ? savedUser.getEmail().getValue() : null,
            savedUser.getFullName(),
            savedUser.getRole()
        ));

        return new AuthResponse(
            accessToken,
            refreshToken,
            UserResponse.fromDomain(savedUser)
        );
    }
}
