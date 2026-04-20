package com.pps.profilesystem.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

/**
 * PostalOffice Entity
 *
 * Relationships with Connectivity:
 * 1. activeConnectivity - Points to the CURRENT active connectivity record (via connectivity_id)
 * 2. connectivityHistory - List of ALL connectivity records for this office (via OfficeID)
 *
 * Archive data is now stored in a separate ArchivedOffice entity / archived_offices table.
 * To check if an office is archived, query ArchivedOfficeRepository.existsByPostalOfficeId(id).
 *
 * Photos:
 *   profilePicture  → profile_picture  (col) — profile avatar
 *   coverPhoto      → cover_photo      (col) — carousel slot 1
 *   coverPhoto2     → cover_photo_2    (col) — carousel slot 2
 *   coverPhoto3     → cover_photo_3    (col) — carousel slot 3
 */
@Entity
@Table(name = "postal_offices")
@Getter
@Setter
public class PostalOffice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // --- Basic Information ---
    private String name;
    private String postmaster;

    @Column(columnDefinition = "TEXT")
    private String address;

    // --- Location Hierarchy ---
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "area_id", nullable = true)
    private Area area;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id", nullable = true)
    private Regions region;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "province_id", nullable = true)
    private Province province;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_mun_id", nullable = true)
    private CityMunicipality cityMunicipality;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "barangay_id", nullable = true)
    private Barangay barangay;

    @Column(name = "zip_code")
    private String zipCode;

    // --- Coordinates ---
    private Double longitude;
    private Double latitude;

    // --- Connection Status ---
    @Column(name = "connection_status")
    private Boolean connectionStatus = false;

    // --- Office Open/Closed Status ---
    @Column(name = "office_status", nullable = true)
    private String officeStatus;  // "OPEN" or "CLOSED"

    // CURRENT/ACTIVE CONNECTIVITY RECORD
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "connectivity_id", nullable = true)
    private Connectivity activeConnectivity;

    // ALL CONNECTIVITY RECORDS (Historical + Current)
    @OneToMany(mappedBy = "postalOffice", fetch = FetchType.LAZY)
    private List<Connectivity> connectivityHistory;

    // --- Staff Information ---
    @Column(name = "no_of_employees")
    private Integer noOfEmployees;

    @Column(name = "no_of_postal_tellers")
    private Integer noOfPostalTellers;

    @Column(name = "no_of_letter_carriers")
    private Integer noOfLetterCarriers;

    // --- Classification & Services ---
    private String classification;

    @Column(name = "service_provided", columnDefinition = "TEXT")
    private String serviceProvided;

    // --- ISP Information ---
    @Column(name = "internet_service_provider")
    private String internetServiceProvider;

    @Column(name = "type_of_connection")
    private String typeOfConnection;

    private String speed;

    @Column(name = "static_ip_address")
    private String staticIpAddress;

    // --- Contact Information ---
    @Column(name = "postal_office_contact_person")
    private String postalOfficeContactPerson;

    @Column(name = "postal_office_contact_number")
    private String postalOfficeContactNumber;

    @Column(name = "isp_contact_person")
    private String ispContactPerson;

    @Column(name = "isp_contact_number")
    private String ispContactNumber;

    // --- Photos (stored as file paths on disk) ---
    @Column(name = "profile_picture")
    private String profilePicture;

    /** Cover photo carousel slot 1 — was the original single cover_photo column. */
    @Column(name = "cover_photo")
    private String coverPhoto;

    /** Cover photo carousel slot 2 — new column added in V2 migration. */
    @Column(name = "cover_photo_2")
    private String coverPhoto2;

    /** Cover photo carousel slot 3 — new column added in V2 migration. */
    @Column(name = "cover_photo_3")
    private String coverPhoto3;

    // --- Remarks ---
    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    // --- Helper Methods ---

    /**
     * Returns the cover photo path for the given carousel slot (1, 2, or 3).
     * Returns null if the slot number is out of range.
     */
    public String getCoverPhotoBySlot(int slot) {
        switch (slot) {
            case 1: return coverPhoto;
            case 2: return coverPhoto2;
            case 3: return coverPhoto3;
            default: return null;
        }
    }

    /**
     * Sets the cover photo path for the given carousel slot (1, 2, or 3).
     * No-op if the slot number is out of range.
     */
    public void setCoverPhotoBySlot(int slot, String path) {
        switch (slot) {
            case 1: this.coverPhoto  = path; break;
            case 2: this.coverPhoto2 = path; break;
            case 3: this.coverPhoto3 = path; break;
        }
    }

    public boolean isConnected() {
        return Boolean.TRUE.equals(connectionStatus) && activeConnectivity != null;
    }

    public String getCurrentProviderName() {
        if (activeConnectivity != null && activeConnectivity.getProvider() != null) {
            return activeConnectivity.getProvider().getName();
        }
        return null;
    }

    public java.time.LocalDateTime getConnectionDate() {
        if (activeConnectivity != null) {
            return activeConnectivity.getDateConnected();
        }
        return null;
    }

    /**
     * Stub for backward compatibility.
     * is_archived column has been removed from postal_offices table.
     * Archive status is now determined by presence in archived_offices table.
     *
     * @deprecated Use ArchivedOfficeRepository.existsByPostalOfficeId(id) instead.
     */
    @Deprecated
    @jakarta.persistence.Transient
    public Boolean getIsArchived() { return false; }
}