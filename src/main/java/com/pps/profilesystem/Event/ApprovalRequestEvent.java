package com.pps.profilesystem.Event;

import com.pps.profilesystem.Entity.ApprovalRequest;
import org.springframework.context.ApplicationEvent;

/**
 * Event for approval request notifications
 */
public class ApprovalRequestEvent extends ApplicationEvent {
    
    private final ApprovalRequest request;
    private final String eventType;
    
    public ApprovalRequestEvent(Object source, ApprovalRequest request, String eventType) {
        super(source);
        this.request = request;
        this.eventType = eventType;
    }
    
    public ApprovalRequest getRequest() {
        return request;
    }
    
    public String getEventType() {
        return eventType;
    }
}
