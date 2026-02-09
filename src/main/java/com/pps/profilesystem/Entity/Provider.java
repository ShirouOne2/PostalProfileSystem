package com.pps.profilesystem.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "provider")
public class Provider {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ProviderID")
    private Integer providerId;

    @Column(name = "Name", nullable = false, length = 100)
    private String name;

    @Column(name = "CreatedStamp", updatable = false)
    private LocalDateTime createdStamp;

    @Column(name = "UpdatedStamp")
    private LocalDateTime updatedStamp;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CreatedBy")
    private User createdBy;

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

    public Integer getProviderId() {
        return providerId;
    }

    public void setProviderId(Integer providerId) {
        this.providerId = providerId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LocalDateTime getCreatedStamp() {
        return createdStamp;
    }

    public LocalDateTime getUpdatedStamp() {
        return updatedStamp;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }
}

