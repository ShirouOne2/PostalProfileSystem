package com.pps.profilesystem.Entity;

import com.pps.profilesystem.DTO.ConnectivityNotification;
import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Persisted connectivity / approval notifications so the inbox survives restarts
 * and read items remain visible (unlike the previous in-memory deque capped at 50).
 */
@Entity
@Table(name = "connectivity_notifications")
@BatchSize(size = 32)
public class ConnectivityNotificationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ConnectivityNotification.Type type;

    @Column(name = "office_name", nullable = false, length = 512)
    private String officeName;

    @Column(name = "office_id")
    private Integer officeId;

    @Column(name = "changed_by", nullable = false, length = 255)
    private String changedBy;

    /** Email of the actor (lowercased). Useful for audit. */
    @Column(name = "actor_email", length = 320)
    private String actorEmail;

    /** Role id of the actor (matches your roles.role_id). Useful for audit. */
    @Column(name = "actor_role_id")
    private Integer actorRoleId;

    /** High level source of the event (e.g. CONNECTIVITY, APPROVAL). */
    @Column(name = "event_source", length = 64)
    private String eventSource;

    /** Domain entity type for audit (e.g. PostalOffice, ApprovalRequest). */
    @Column(name = "entity_type", length = 64)
    private String entityType;

    /** Domain entity id for audit. */
    @Column(name = "entity_id")
    private Long entityId;

    @Column(columnDefinition = "TEXT")
    private String detail;

    /** Null or blank = visible to every authenticated user. */
    @Column(name = "recipient_email", length = 320)
    private String recipientEmail;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "connectivity_notification_read_by",
            joinColumns = @JoinColumn(name = "notification_id", nullable = false)
    )
    @Column(name = "user_email_lower", nullable = false, length = 320)
    private Set<String> readByEmails = new HashSet<>();

    public void addReadEmail(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        readByEmails.add(email.trim().toLowerCase());
    }

    public Long getId() {
        return id;
    }

    public ConnectivityNotification.Type getType() {
        return type;
    }

    public void setType(ConnectivityNotification.Type type) {
        this.type = type;
    }

    public String getOfficeName() {
        return officeName;
    }

    public void setOfficeName(String officeName) {
        this.officeName = officeName;
    }

    public Integer getOfficeId() {
        return officeId;
    }

    public void setOfficeId(Integer officeId) {
        this.officeId = officeId;
    }

    public String getChangedBy() {
        return changedBy;
    }

    public void setChangedBy(String changedBy) {
        this.changedBy = changedBy;
    }

    public String getActorEmail() {
        return actorEmail;
    }

    public void setActorEmail(String actorEmail) {
        this.actorEmail = actorEmail;
    }

    public Integer getActorRoleId() {
        return actorRoleId;
    }

    public void setActorRoleId(Integer actorRoleId) {
        this.actorRoleId = actorRoleId;
    }

    public String getEventSource() {
        return eventSource;
    }

    public void setEventSource(String eventSource) {
        this.eventSource = eventSource;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public Long getEntityId() {
        return entityId;
    }

    public void setEntityId(Long entityId) {
        this.entityId = entityId;
    }

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public void setRecipientEmail(String recipientEmail) {
        this.recipientEmail = recipientEmail;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Set<String> getReadByEmails() {
        return readByEmails;
    }
}
