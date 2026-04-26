package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.AuthResponse;
import com.example.lms.identity.application.dto.RegisterUserCommand;
import com.example.lms.identity.application.dto.UserResponse;
import com.example.lms.identity.application.port.TokenService;
import com.example.lms.identity.domain.event.UserRegisteredEvent;
import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.event.DomainEventPublisher;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.identity.domain.valueobject.PasswordPolicy;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Use case for registering a new user using DDD domain models.
 *
 * Clean Architecture: No infrastructure imports.
 * Uses domain UserRepository, TokenService port, and DomainEventPublisher port only.
 */
@Service("registerUserUseCaseV2")
@RequiredArgsConstructor
@Slf4j
public class RegisterUserUseCaseV2 {

    @Qualifier("newUserRepositoryAdapter")
    private final UserRepository userRepository;
    private final TokenService tokenService;
    private final PasswordEncoder passwordEncoder;
    private final DomainEventPublisher eventPublisher;
    private final AcceptInviteUseCase acceptInviteUseCase;
    private final OrganizationRepository organizationRepository;

    // Issue #231 (Phase 1): default org code đã đổi WIII -> HOLILIHU (V119
    // migration). Dùng `findDefault()` thay hardcode để tránh fragility nếu
    // sau này admin rename code lần nữa.
    private static final String LEGACY_DEFAULT_ORG_CODE = "HOLILIHU";

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

        // P0-1: Public registration always STUDENT (prevent privilege escalation)
        Role role = Role.STUDENT;

        // P0-2: Enforce PasswordPolicy on registration
        String passwordError = PasswordPolicy.validate(command.password());
        if (passwordError != null) {
            throw new ValidationException("password", passwordError);
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

        // Assign organization: invite code → org, or default Wiii Org
        if (command.inviteCode() != null && !command.inviteCode().isBlank()) {
            try {
                java.util.UUID orgId = acceptInviteUseCase.acceptForNewUser(command.inviteCode().trim());
                user.assignToOrganization(orgId);
            } catch (EntityNotFoundException e) {
                throw new ValidationException("inviteCode", "Mã mời không hợp lệ hoặc đã hết hạn");
            } catch (IllegalStateException e) {
                throw new ValidationException("inviteCode", e.getMessage());
            }
        } else {
            // Issue #231 (Phase 1): default to platform org via findDefault()
            // (PLATFORM type + is_default=true). Fallback findByCode cho
            // legacy compat nếu migration chưa apply (dev/staging old).
            // Phase 1 enforce mọi user thuộc 1 org -> throw nếu không tìm
            // thấy default org (data inconsistency, không cho silent fail).
            Organization defaultOrg = organizationRepository.findDefault()
                    .filter(Organization::isEnabled)
                    .or(() -> organizationRepository.findByCode(LEGACY_DEFAULT_ORG_CODE)
                            .filter(Organization::isEnabled))
                    .orElseThrow(() -> new IllegalStateException(
                            "Không tìm thấy tổ chức nền tảng mặc định — V119 migration phải được apply"));
            user.assignToOrganization(defaultOrg.getId());
        }

        // Save using domain repository
        User savedUser = userRepository.save(user);

        // Generate tokens via domain port — org-aware refresh expiry
        String email = savedUser.getEmail() != null ? savedUser.getEmail().getValue() : savedUser.getUsername();
        long refreshExpiryMs = computeRefreshExpiryMs(savedUser);
        String accessToken = tokenService.generateAccessToken(
                savedUser.getId().value(), email, savedUser.getRole().name(), savedUser.getOrganizationId());
        String refreshToken = tokenService.generateRefreshToken(
                savedUser.getId().value(), email, savedUser.getRole().name(), refreshExpiryMs);

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

    private long computeRefreshExpiryMs(User user) {
        if (user.getTokenExpiryDays() != null) {
            return user.getTokenExpiryDays() * 86_400_000L;
        }
        if (user.getOrganizationId() != null) {
            return organizationRepository.findById(user.getOrganizationId())
                .map(org -> org.getTokenExpiryDays() * 86_400_000L)
                .orElse(30L * 86_400_000L);
        }
        return 30L * 86_400_000L;
    }
}
