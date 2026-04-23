package com.pps.profilesystem.DTO;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lightweight in-memory notification record for connectivity changes.
 *
 * Created whenever a non-admin user:
 *   - adds a new Connectivity record (NEW)
 *   - updates an existing Connectivity record (UPDATED)
 *   - connects / disconnects a PostalOffice (CONNECTED / DISCONNECTED)
 */
public class ConnectivityNotification {

    public enum Type { NEW, UPDATED, CONNECTED, DISCONNECTED }

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("MMM d, h:mm a");

    // ── Fields ──────────────────────────────────────────────────────────────

    private final long id;
    private final Type type;
    private final String officeName;
    private final Integer officeId;
    private final String changedBy;        // username of the actor
    private final String detail;           // e.g. provider name, plan, etc.
    private final String recipientEmail;   // null = visible to all, otherwise only this user
    private final LocalDateTime timestamp;
    private final Set<String> readByEmails = ConcurrentHashMap.newKeySet();

    // ── Constructor ─────────────────────────────────────────────────────────

    public ConnectivityNotification(long id, Type type,
                                    String officeName, Integer officeId,
                                    String changedBy, String detail,
                                    String recipientEmail) {
        this(id, type, officeName, officeId, changedBy, detail, recipientEmail, LocalDateTime.now());
    }

    /** Full constructor (used when hydrating from persistent storage). */
    public ConnectivityNotification(long id, Type type,
                                    String officeName, Integer officeId,
                                    String changedBy, String detail,
                                    String recipientEmail,
                                    LocalDateTime timestamp) {
        this.id         = id;
        this.type       = type;
        this.officeName = officeName;
        this.officeId   = officeId;
        this.changedBy  = changedBy;
        this.detail     = detail;
        this.recipientEmail = recipientEmail;
        this.timestamp  = timestamp != null ? timestamp : LocalDateTime.now();
    }

    // ── Derived helpers ──────────────────────────────────────────────────────

    /** Human-readable label for the notification type. */
    public String getTypeLabel() {
        switch (type) {
            case NEW:          return "New Connectivity";
            case UPDATED:      return "Connectivity Updated";
            case CONNECTED:    return "Office Connected";
            case DISCONNECTED: return "Office Disconnected";
            default:           return "Change";
        }
    }

    /** Font-Awesome icon class for each type. */
    public String getIcon() {
        switch (type) {
            case NEW:          return "fas fa-plug";
            case UPDATED:      return "fas fa-edit";
            case CONNECTED:    return "fas fa-wifi";
            case DISCONNECTED: return "fas fa-unlink";
            default:           return "fas fa-bell";
        }
    }

    /** Badge colour (Bootstrap) for each type. */
    public String getColor() {
        switch (type) {
            case NEW:          return "#28a745";   // green
            case UPDATED:      return "#007bff";   // blue
            case CONNECTED:    return "#17a2b8";   // teal
            case DISCONNECTED: return "#dc3545";   // red
            default:           return "#6c757d";
        }
    }

    public String getTimestampFormatted() { return timestamp.format(FMT); }
    public String getRecipientEmail() { return recipientEmail; }
    public boolean isVisibleTo(String email) {
        return recipientEmail == null || recipientEmail.isBlank()
                || (email != null && recipientEmail.equalsIgnoreCase(email));
    }
    public boolean isReadBy(String email) {
        return email != null && readByEmails.stream().anyMatch(e -> e.equalsIgnoreCase(email));
    }
    public void markReadBy(String email) {
        if (email != null && !email.isBlank()) {
            readByEmails.add(email.toLowerCase());
        }
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public long          getId()         { return id; }
    public Type          getType()       { return type; }
    public String        getOfficeName() { return officeName; }
    public Integer       getOfficeId()   { return officeId; }
    public String        getChangedBy()  { return changedBy; }
    public String        getDetail()     { return detail; }
    public LocalDateTime getTimestamp()  { return timestamp; }
}