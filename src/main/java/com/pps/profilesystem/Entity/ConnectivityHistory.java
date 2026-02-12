package com.pps.profilesystem.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity to store quarterly connectivity snapshots
 * Used to track connectivity changes over time
 */
@Entity
@Table(name = "connectivity_history")
public class ConnectivityHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "office_id", nullable = false)
    private PostalOffice postalOffice;

    @Column(name = "snapshot_year", nullable = false)
    private Integer year;

    @Column(name = "snapshot_quarter", nullable = false)
    private Integer quarter; // 1, 2, 3, or 4

    @Column(name = "was_connected", nullable = false)
    private Boolean wasConnected;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDateTime snapshotDate;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Optional: Track which connectivity record was active at the time
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "connectivity_id")
    private Connectivity connectivity;

    // ==================== Lifecycle Hooks ====================

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (snapshotDate == null) {
            snapshotDate = LocalDateTime.now();
        }
    }

    // ==================== Getters & Setters ====================

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public PostalOffice getPostalOffice() {
        return postalOffice;
    }

    public void setPostalOffice(PostalOffice postalOffice) {
        this.postalOffice = postalOffice;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public Integer getQuarter() {
        return quarter;
    }

    public void setQuarter(Integer quarter) {
        this.quarter = quarter;
    }

    public Boolean getWasConnected() {
        return wasConnected;
    }

    public void setWasConnected(Boolean wasConnected) {
        this.wasConnected = wasConnected;
    }

    public LocalDateTime getSnapshotDate() {
        return snapshotDate;
    }

    public void setSnapshotDate(LocalDateTime snapshotDate) {
        this.snapshotDate = snapshotDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public Connectivity getConnectivity() {
        return connectivity;
    }

    public void setConnectivity(Connectivity connectivity) {
        this.connectivity = connectivity;
    }
}