package com.pps.profilesystem.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

/**
 * ApprovalRequest Entity
 *
 * 3-Level Approval Flow:
 *  1. USER submits → status = PENDING           → Area Admin is notified
 *  2. AREA_ADMIN approves → status = AREA_APPROVED → Operation is notified
 *     AREA_ADMIN rejects  → status = REJECTED
 *  3. OPERATION approves → status = APPROVED → data is actually applied to DB
 *     OPERATION rejects  → status = REJECTED
 *
 * Data is NEVER written to the postal_offices table until Operation gives
 * final approval (status = APPROVED).
 */
@Entity
@Table(name = "approval_requests")
@Getter
@Setter
public class ApprovalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestType requestType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status;

    @Column(name = "office_id")
    private Integer officeId;

    @Column(name = "office_name")
    private String officeName;

    // Requester (User, role 3)
    @Column(name = "requested_by", nullable = false)
    private String requestedBy;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    // Area Admin review (role 2)
    @Column(name = "area_admin_processed_by")
    private String areaAdminProcessedBy;

    @Column(name = "area_admin_processed_at")
    private LocalDateTime areaAdminProcessedAt;

    @Column(name = "area_admin_notes", columnDefinition = "TEXT")
    private String areaAdminNotes;

    // Operation final review (role 4)
    @Column(name = "processed_by")
    private String processedBy;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @Column(columnDefinition = "TEXT")
    private String oldValues;

    @Column(columnDefinition = "TEXT")
    private String newValues;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "area_id")
    private Area area;

    public enum RequestType {
        NEW_OFFICE("New Office"),
        EDIT_OFFICE("Edit Office"),
        DELETE_OFFICE("Delete Office");

        private final String displayName;
        RequestType(String displayName) { this.displayName = displayName; }
        public String getDisplayName() { return displayName; }
    }

    public enum RequestStatus {
        PENDING("Pending"),
        AREA_APPROVED("Area Approved – Awaiting Operation"),
        APPROVED("Approved"),
        REJECTED("Rejected");

        private final String displayName;
        RequestStatus(String displayName) { this.displayName = displayName; }
        public String getDisplayName() { return displayName; }
    }

    @PrePersist
    protected void onCreate() {
        if (requestedAt == null) requestedAt = LocalDateTime.now();
        if (status == null)      status      = RequestStatus.PENDING;
    }

    @PreUpdate
    protected void onUpdate() {
        if ((status == RequestStatus.APPROVED || status == RequestStatus.REJECTED)
                && processedAt == null && processedBy != null) {
            processedAt = LocalDateTime.now();
        }
        if (status == RequestStatus.AREA_APPROVED
                && areaAdminProcessedAt == null && areaAdminProcessedBy != null) {
            areaAdminProcessedAt = LocalDateTime.now();
        }
    }
}