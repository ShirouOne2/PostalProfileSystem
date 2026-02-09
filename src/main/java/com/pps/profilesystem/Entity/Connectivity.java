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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CreatedBy")
    private User createdBy;

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
    // Lifecycle hooks
    // =======================

    @PrePersist
    protected void onCreate() {
        createdStamp = LocalDateTime.now();
        updatedStamp = LocalDateTime.now();
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

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
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

    public LocalDateTime getUpdatedStamp() {
        return updatedStamp;
    }
}
