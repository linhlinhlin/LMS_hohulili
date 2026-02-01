package com.example.lms.identity.domain.event;

import com.example.lms.shared.domain.event.AbstractDomainEvent;
import com.example.lms.shared.domain.valueobject.UserId;

/**
 * Event raised when a user updates their profile.
 */
public class UserProfileUpdatedEvent extends AbstractDomainEvent {
    
    private final UserId userId;
    private final String fullName;
    private final String email;
    
    public UserProfileUpdatedEvent(UserId userId, String fullName, String email) {
        super(userId.value());
        this.userId = userId;
        this.fullName = fullName;
        this.email = email;
    }
    
    @Override
    public String getEventType() {
        return "UserProfileUpdated";
    }
    
    public UserId getUserId() { return userId; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
}
