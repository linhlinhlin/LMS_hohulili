package com.example.lms.identity.domain.event;

import com.example.lms.identity.domain.model.Role;
import com.example.lms.shared.domain.event.AbstractDomainEvent;
import com.example.lms.shared.domain.valueobject.UserId;

import java.util.UUID;

/**
 * Event raised when a new user registers in the system.
 */
public class UserRegisteredEvent extends AbstractDomainEvent {
    
    private final UserId userId;
    private final String username;
    private final String email;
    private final String fullName;
    private final Role role;
    
    public UserRegisteredEvent(UserId userId, String username, String email, 
                                String fullName, Role role) {
        super(userId.value());
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
    }
    
    @Override
    public String getEventType() {
        return "UserRegistered";
    }
    
    public UserId getUserId() { return userId; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public Role getRole() { return role; }
}
