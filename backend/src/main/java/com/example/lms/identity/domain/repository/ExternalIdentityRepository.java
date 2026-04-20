package com.example.lms.identity.domain.repository;

import com.example.lms.identity.domain.model.ExternalIdentityProvider;
import com.example.lms.identity.domain.model.UserExternalIdentity;
import com.example.lms.shared.domain.valueobject.UserId;

import java.util.Optional;

public interface ExternalIdentityRepository {

    Optional<UserExternalIdentity> findByProviderAndExternalSubject(
            ExternalIdentityProvider provider,
            String externalSubject
    );

    boolean existsByUserIdAndProvider(
            UserId userId,
            ExternalIdentityProvider provider
    );

    UserExternalIdentity save(UserExternalIdentity identity);
}
