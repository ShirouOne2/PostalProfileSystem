package com.pps.profilesystem.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_approval_requests")
public class UserApprovalRequest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long userId; // The user being modified
    
    @Column(nullable = false)
    private Long requestedBy; // Who made the request
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestType requestType;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApprovalStatus status;
    
    @Column(columnDefinition = "TEXT")
    private String requestedChanges; // JSON string of changes
    
    @Column(columnDefinition = "TEXT")
    private String originalData; // JSON string of original data
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    private LocalDateTime areaAdminApprovedAt;
    private Long areaAdminApprovedBy;
    private String areaAdminNotes;
    
    private LocalDateTime srdApprovedAt;
    private Long srdApprovedBy;
    private String srdNotes;
    
    // Constructors
    public UserApprovalRequest() {
        this.createdAt = LocalDateTime.now();
        this.status = ApprovalStatus.PENDING;
    }
    
    // Enums
    public enum RequestType {
        CREATE_USER,
        UPDATE_USER,
        DELETE_USER
    }
    
    public enum ApprovalStatus {
        PENDING,
        AREA_ADMIN_APPROVED,
        SRD_APPROVED,
        AREA_ADMIN_REJECTED,
        SRD_REJECTED
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Long getUserId() {
        return userId;
    }
    
    public void setUserId(Long userId) {
        this.userId = userId;
    }
    
    public Long getRequestedBy() {
        return requestedBy;
    }
    
    public void setRequestedBy(Long requestedBy) {
        this.requestedBy = requestedBy;
    }
    
    public RequestType getRequestType() {
        return requestType;
    }
    
    public void setRequestType(RequestType requestType) {
        this.requestType = requestType;
    }
    
    public ApprovalStatus getStatus() {
        return status;
    }
    
    public void setStatus(ApprovalStatus status) {
        this.status = status;
    }
    
    public String getRequestedChanges() {
        return requestedChanges;
    }
    
    public void setRequestedChanges(String requestedChanges) {
        this.requestedChanges = requestedChanges;
    }
    
    public String getOriginalData() {
        return originalData;
    }
    
    public void setOriginalData(String originalData) {
        this.originalData = originalData;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getAreaAdminApprovedAt() {
        return areaAdminApprovedAt;
    }
    
    public void setAreaAdminApprovedAt(LocalDateTime areaAdminApprovedAt) {
        this.areaAdminApprovedAt = areaAdminApprovedAt;
    }
    
    public Long getAreaAdminApprovedBy() {
        return areaAdminApprovedBy;
    }
    
    public void setAreaAdminApprovedBy(Long areaAdminApprovedBy) {
        this.areaAdminApprovedBy = areaAdminApprovedBy;
    }
    
    public String getAreaAdminNotes() {
        return areaAdminNotes;
    }
    
    public void setAreaAdminNotes(String areaAdminNotes) {
        this.areaAdminNotes = areaAdminNotes;
    }
    
    public LocalDateTime getSrdApprovedAt() {
        return srdApprovedAt;
    }
    
    public void setSrdApprovedAt(LocalDateTime srdApprovedAt) {
        this.srdApprovedAt = srdApprovedAt;
    }
    
    public Long getSrdApprovedBy() {
        return srdApprovedBy;
    }
    
    public void setSrdApprovedBy(Long srdApprovedBy) {
        this.srdApprovedBy = srdApprovedBy;
    }
    
    public String getSrdNotes() {
        return srdNotes;
    }
    
    public void setSrdNotes(String srdNotes) {
        this.srdNotes = srdNotes;
    }
}
