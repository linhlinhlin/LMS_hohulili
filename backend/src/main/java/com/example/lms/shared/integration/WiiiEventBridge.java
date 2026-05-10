package com.example.lms.shared.integration;

import com.example.lms.assessment.domain.event.QuizSubmittedEvent;
import com.example.lms.assessment.domain.event.SubmissionGradedEvent;
import com.example.lms.shared.domain.event.DomainEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Anti-corruption bridge: LMS domain events to Wiii AI webhooks.
 */
@Component
public class WiiiEventBridge {

    private static final Logger log = LoggerFactory.getLogger(WiiiEventBridge.class);

    private final WiiiLmsEventPublisher wiiiLmsEventPublisher;
    private final WiiiIntegrationConfig config;

    public WiiiEventBridge(WiiiLmsEventPublisher wiiiLmsEventPublisher, WiiiIntegrationConfig config) {
        this.wiiiLmsEventPublisher = wiiiLmsEventPublisher;
        this.config = config;
    }

    @EventListener
    public void onDomainEvent(DomainEvent event) {
        if (!config.getWebhook().isEnabled()) {
            return;
        }

        String eventType = event.getEventType();
        log.debug("Domain event received for Wiii forwarding: {}", eventType);

        switch (eventType) {
            case "QuizSubmittedEvent" -> wiiiLmsEventPublisher.sendQuizCompleted((QuizSubmittedEvent) event);
            case "SubmissionGradedEvent" -> wiiiLmsEventPublisher.sendSubmissionGraded((SubmissionGradedEvent) event);
            default -> log.trace("Ignoring event type for Wiii: {}", eventType);
        }
    }
}
