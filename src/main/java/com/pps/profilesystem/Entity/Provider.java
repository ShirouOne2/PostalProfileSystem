package com.pps.profilesystem.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "provider")
public class Provider {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "providerid")  // ✅ Changed to lowercase
    private Integer providerId;

    @Column(name = "name", nullable = false, length = 100)  // ✅ Changed to lowercase
    private String name;

    @Column(name = "created_stamp", updatable = false)  // ✅ Changed to snake_case
    private LocalDateTime createdStamp;

    @Column(name = "updated_stamp")  // ✅ Changed to snake_case
    private LocalDateTime updatedStamp;
    
    @Column(name = "created_by")  // ✅ Add this field (missing from entity)
    private Long createdBy;

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

    public void setUpdatedStamp(LocalDateTime updatedStamp) {
        this.updatedStamp = updatedStamp;
    }
    
    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }
}