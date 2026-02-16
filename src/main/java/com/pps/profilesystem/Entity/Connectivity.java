package com.pps.profilesystem.Entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "connectivity")
public class Connectivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ConnectivityID")
    private Integer connectivityId;

    // =======================
    // Relationships
    // =======================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "OfficeID", nullable = false)
    private PostalOffice postalOffice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ProviderID", nullable = false)
    private Provider provider;

    // =======================
    // Fields
    // =======================

    @Column(name = "IsWired")
    private Boolean isWired;

    @Column(name = "IsFree")
    private Boolean isFree;

    @Column(name = "IsShared")
    private Boolean isShared;

    @Column(name = "PlanName", length = 100)
    private String planName;

    @Column(name = "PlanPrice", precision = 10, scale = 2)
    private BigDecimal planPrice;

    @Column(name = "PlanContract", length = 100)
    private String planContract;

    @Column(name = "AccountNumber", length = 50)
    private String accountNumber;

    @Column(name = "CreatedStamp", updatable = false)
    private LocalDateTime createdStamp;

    @Column(name = "UpdatedStamp")
    private LocalDateTime updatedStamp;

    // =======================
    // NEW: Connection Date Tracking
    // =======================

    @Column(name = "date_connected")
    private LocalDateTime dateConnected;

    @Column(name = "date_disconnected")
    private LocalDateTime dateDisconnected;

    // =======================
    // Lifecycle hooks
    // =======================

    @PrePersist
    protected void onCreate() {
        createdStamp = LocalDateTime.now();
        updatedStamp = LocalDateTime.now();
        
        // Automatically set connection date when creating new connectivity record
        if (dateConnected == null) {
            dateConnected = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedStamp = LocalDateTime.now();
    }

    // =======================
    // Getters & Setters
    // =======================

    public Integer getConnectivityId() {
        return connectivityId;
    }

    public void setConnectivityId(Integer connectivityId) {
        this.connectivityId = connectivityId;
    }

    public PostalOffice getPostalOffice() {
        return postalOffice;
    }

    public void setPostalOffice(PostalOffice postalOffice) {
        this.postalOffice = postalOffice;
    }

    public Provider getProvider() {
        return provider;
    }

    public void setProvider(Provider provider) {
        this.provider = provider;
    }

    public Boolean getIsWired() {
        return isWired;
    }

    public void setIsWired(Boolean isWired) {
        this.isWired = isWired;
    }

    public Boolean getIsFree() {
        return isFree;
    }

    public void setIsFree(Boolean isFree) {
        this.isFree = isFree;
    }

    public Boolean getIsShared() {
        return isShared;
    }

    public void setIsShared(Boolean isShared) {
        this.isShared = isShared;
    }

    public String getPlanName() {
        return planName;
    }

    public void setPlanName(String planName) {
        this.planName = planName;
    }

    public BigDecimal getPlanPrice() {
        return planPrice;
    }

    public void setPlanPrice(BigDecimal planPrice) {
        this.planPrice = planPrice;
    }

    public String getPlanContract() {
        return planContract;
    }

    public void setPlanContract(String planContract) {
        this.planContract = planContract;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public LocalDateTime getCreatedStamp() {
        return createdStamp;
    }

    public void setCreatedStamp(LocalDateTime createdStamp) {
        this.createdStamp = createdStamp;
    }

    public LocalDateTime getUpdatedStamp() {
        return updatedStamp;
    }

    public void setUpdatedStamp(LocalDateTime updatedStamp) {
        this.updatedStamp = updatedStamp;
    }

    // =======================
    // NEW: Date Tracking Getters & Setters
    // =======================

    public LocalDateTime getDateConnected() {
        return dateConnected;
    }

    public void setDateConnected(LocalDateTime dateConnected) {
        this.dateConnected = dateConnected;
    }

    public LocalDateTime getDateDisconnected() {
        return dateDisconnected;
    }

    public void setDateDisconnected(LocalDateTime dateDisconnected) {
        this.dateDisconnected = dateDisconnected;
    }

    // =======================
    // Helper Methods
    // =======================

    /**
     * Check if this connection is currently active
     * (connected but not disconnected)
     */
    public boolean isActive() {
        return dateConnected != null && dateDisconnected == null;
    }

    /**
     * Mark this connection as disconnected
     */
    public void disconnect() {
        if (dateDisconnected == null) {
            this.dateDisconnected = LocalDateTime.now();
        }
    }

    /**
     * Get the quarter number (1-4) when this connection was established
     */
    public Integer getConnectionQuarter() {
        if (dateConnected == null) return null;
        return (dateConnected.getMonthValue() - 1) / 3 + 1;
    }

    /**
     * Get the year when this connection was established
     */
    public Integer getConnectionYear() {
        if (dateConnected == null) return null;
        return dateConnected.getYear();
    }

    /**
     * Get the quarter number (1-4) when this connection was terminated
     */
    public Integer getDisconnectionQuarter() {
        if (dateDisconnected == null) return null;
        return (dateDisconnected.getMonthValue() - 1) / 3 + 1;
    }

    /**
     * Get the year when this connection was terminated
     */
    public Integer getDisconnectionYear() {
        if (dateDisconnected == null) return null;
        return dateDisconnected.getYear();
    }
}