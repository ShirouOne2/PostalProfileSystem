package com.pps.profilesystem.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * ArchivedOffice Entity — maps to archived_offices table.
 *
 * The FK column is named postal_office_id to match Hibernate's
 * derived naming convention for the field 'postalOffice'.
 * This avoids column-name mismatch in correlated subqueries.
 */
@Entity
@Table(name = "archived_offices")
public class ArchivedOffice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "postal_office_id", nullable = false, unique = true)
    private PostalOffice postalOffice;

    @Column(name = "archived_at", nullable = false)
    private LocalDateTime archivedAt;

    @Column(name = "archive_reason", columnDefinition = "TEXT")
    private String archiveReason;

    @Column(name = "archived_by")
    private String archivedBy;

    public ArchivedOffice() {}

    public ArchivedOffice(PostalOffice postalOffice, String archiveReason, String archivedBy) {
        this.postalOffice  = postalOffice;
        this.archiveReason = archiveReason;
        this.archivedBy    = archivedBy;
        this.archivedAt    = LocalDateTime.now();
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public PostalOffice getPostalOffice() { return postalOffice; }
    public void setPostalOffice(PostalOffice postalOffice) { this.postalOffice = postalOffice; }

    public LocalDateTime getArchivedAt() { return archivedAt; }
    public void setArchivedAt(LocalDateTime archivedAt) { this.archivedAt = archivedAt; }

    public String getArchiveReason() { return archiveReason; }
    public void setArchiveReason(String archiveReason) { this.archiveReason = archiveReason; }

    public String getArchivedBy() { return archivedBy; }
    public void setArchivedBy(String archivedBy) { this.archivedBy = archivedBy; }
}