package com.example.lms.identity.infrastructure.service;

import com.example.lms.identity.domain.repository.OrganizationInviteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job to expire stale invites.
 * Runs every hour. Uses domain repository (not JPA directly).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class InviteExpiryScheduler {

    private final OrganizationInviteRepository inviteRepo;

    @Scheduled(fixedRate = 3600_000) // Every hour
    public void expireStaleInvites() {
        int expired = inviteRepo.markExpiredInvites();
        if (expired > 0) {
            log.info("Expired {} stale organization invites", expired);
        }
    }
}
