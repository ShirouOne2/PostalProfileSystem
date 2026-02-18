package com.pps.profilesystem.Entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

/**
 * PostalOffice Entity
 * 
 * Relationships with Connectivity:
 * 1. activeConnectivity - Points to the CURRENT active connectivity record (via connectivity_id)
 * 2. connectivityHistory - List of ALL connectivity records for this office (via OfficeID)
 */
@Entity
@Table(name = "postal_offices")
@Data
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
    // EAGER fetch - frequently accessed in tables and maps
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "area_id", nullable = true)
    private Area area;

    // LAZY fetch - less frequently accessed
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

    // â­ CURRENT/ACTIVE CONNECTIVITY RECORD
    // Points to the connectivity record that is currently active
    // This should only be set if connection_status = TRUE
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "connectivity_id", nullable = true)
    private Connectivity activeConnectivity;

    // â­ ALL CONNECTIVITY RECORDS (Historical + Current)
    // This is the reverse side of the Connectivity.postalOffice relationship
    // Includes both active and disconnected connectivity records
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
    
   // --- Archive ---
    @Column(name = "is_archived", nullable = false)
    private Boolean isArchived = false;

    @Column(name = "archived_at")
    private java.time.LocalDateTime archivedAt;

    @Column(name = "archive_reason", columnDefinition = "TEXT")
    private String archiveReason;

    // Getters & Setters
    public Boolean getIsArchived() { return isArchived; }
    public void setIsArchived(Boolean isArchived) { this.isArchived = isArchived; }

    public java.time.LocalDateTime getArchivedAt() { return archivedAt; }
    public void setArchivedAt(java.time.LocalDateTime archivedAt) { this.archivedAt = archivedAt; }

    public String getArchiveReason() { return archiveReason; }
    public void setArchiveReason(String archiveReason) { this.archiveReason = archiveReason; }

     // --- Getters & Setters ---
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPostmaster() { return postmaster; }
    public void setPostmaster(String postmaster) { this.postmaster = postmaster; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Area getArea() { return area; }
    public void setArea(Area area) { this.area = area; }

    public Regions getRegion() { return region; }
    public void setRegion(Regions region) { this.region = region; }

    public Province getProvince() { return province; }
    public void setProvince(Province province) { this.province = province; }

    public CityMunicipality getCityMunicipality() { return cityMunicipality; }
    public void setCityMunicipality(CityMunicipality cityMunicipality) { this.cityMunicipality = cityMunicipality; }

    public Barangay getBarangay() { return barangay; }
    public void setBarangay(Barangay barangay) { this.barangay = barangay; }

    public String getZipCode() { return zipCode; }
    public void setZipCode(String zipCode) { this.zipCode = zipCode; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Boolean getConnectionStatus() { return connectionStatus; }
    public void setConnectionStatus(Boolean connectionStatus) { this.connectionStatus = connectionStatus; }

    // â­ Active Connectivity getter/setter
    public Connectivity getActiveConnectivity() { return activeConnectivity; }
    public void setActiveConnectivity(Connectivity activeConnectivity) { this.activeConnectivity = activeConnectivity; }

    // â­ Connectivity History getter/setter
    public List<Connectivity> getConnectivityHistory() { return connectivityHistory; }
    public void setConnectivityHistory(List<Connectivity> connectivityHistory) { this.connectivityHistory = connectivityHistory; }

    public Integer getNoOfEmployees() { return noOfEmployees; }
    public void setNoOfEmployees(Integer noOfEmployees) { this.noOfEmployees = noOfEmployees; }

    public Integer getNoOfPostalTellers() { return noOfPostalTellers; }
    public void setNoOfPostalTellers(Integer noOfPostalTellers) { this.noOfPostalTellers = noOfPostalTellers; }

    public Integer getNoOfLetterCarriers() { return noOfLetterCarriers; }
    public void setNoOfLetterCarriers(Integer noOfLetterCarriers) { this.noOfLetterCarriers = noOfLetterCarriers; }

    public String getClassification() { return classification; }
    public void setClassification(String classification) { this.classification = classification; }

    public String getServiceProvided() { return serviceProvided; }
    public void setServiceProvided(String serviceProvided) { this.serviceProvided = serviceProvided; }

    public String getInternetServiceProvider() { return internetServiceProvider; }
    public void setInternetServiceProvider(String internetServiceProvider) { this.internetServiceProvider = internetServiceProvider; }

    public String getTypeOfConnection() { return typeOfConnection; }
    public void setTypeOfConnection(String typeOfConnection) { this.typeOfConnection = typeOfConnection; }

    public String getSpeed() { return speed; }
    public void setSpeed(String speed) { this.speed = speed; }

    public String getStaticIpAddress() { return staticIpAddress; }
    public void setStaticIpAddress(String staticIpAddress) { this.staticIpAddress = staticIpAddress; }

    public String getPostalOfficeContactPerson() { return postalOfficeContactPerson; }
    public void setPostalOfficeContactPerson(String postalOfficeContactPerson) { this.postalOfficeContactPerson = postalOfficeContactPerson; }

    public String getPostalOfficeContactNumber() { return postalOfficeContactNumber; }
    public void setPostalOfficeContactNumber(String postalOfficeContactNumber) { this.postalOfficeContactNumber = postalOfficeContactNumber; }

    public String getIspContactPerson() { return ispContactPerson; }
    public void setIspContactPerson(String ispContactPerson) { this.ispContactPerson = ispContactPerson; }

    public String getIspContactNumber() { return ispContactNumber; }
    public void setIspContactNumber(String ispContactNumber) { this.ispContactNumber = ispContactNumber; }

    // --- Helper Methods ---
    
    /**
     * Check if this office is currently connected
     */
    public boolean isConnected() {
        return Boolean.TRUE.equals(connectionStatus) && activeConnectivity != null;
    }

    /**
     * Get the provider name if currently connected
     */
    public String getCurrentProviderName() {
        if (activeConnectivity != null && activeConnectivity.getProvider() != null) {
            return activeConnectivity.getProvider().getName();
        }
        return null;
    }

    /**
     * Get the connection date if currently connected
     */
    public java.time.LocalDateTime getConnectionDate() {
        if (activeConnectivity != null) {
            return activeConnectivity.getDateConnected();
        }
        return null;
    }
}