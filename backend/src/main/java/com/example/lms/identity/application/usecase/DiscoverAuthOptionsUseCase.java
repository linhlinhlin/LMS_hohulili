package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.DiscoverAuthOptionsCommand;
import com.example.lms.identity.application.dto.DiscoverAuthOptionsResponse;
import com.example.lms.identity.domain.model.ExternalIdentityProvider;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.ExternalIdentityRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.Email;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DiscoverAuthOptionsUseCase {

    @Qualifier("newUserRepositoryAdapter")
    private final UserRepository userRepository;
    private final ExternalIdentityRepository externalIdentityRepository;

    public DiscoverAuthOptionsResponse execute(DiscoverAuthOptionsCommand command) {
        String normalizedEmail = Email.of(command.email()).getValue();

        return userRepository.findByEmail(normalizedEmail)
                .map(user -> mapExistingUser(normalizedEmail, user))
                .orElseGet(() -> DiscoverAuthOptionsResponse.register(normalizedEmail));
    }

    private DiscoverAuthOptionsResponse mapExistingUser(String normalizedEmail, User user) {
        boolean googleLinked = externalIdentityRepository.existsByUserIdAndProvider(
                user.getId(),
                ExternalIdentityProvider.GOOGLE
        );

        if (googleLinked) {
            return DiscoverAuthOptionsResponse.google(normalizedEmail, user.getFullName());
        }

        return DiscoverAuthOptionsResponse.password(normalizedEmail, user.getFullName());
    }
}
