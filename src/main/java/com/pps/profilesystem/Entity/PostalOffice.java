package com.pps.profilesystem.Entity;

import jakarta.persistence.*;
import lombok.Data;

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

    // Changed to LAZY - NOT displayed in quarters table, causing N+1 queries
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_mun_id", nullable = true)
    private CityMunicipality cityMunicipality;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "barangay_id", nullable = true)
    private Barangay barangay;

    private String zipCode;
    private Double longitude;
    private Double latitude;

    @Column(name = "connection_status")
    private Boolean connectionStatus = false;

    private String internetServiceProvider;

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

    public String getInternetServiceProvider() { return internetServiceProvider; }
    public void setInternetServiceProvider(String internetServiceProvider) { this.internetServiceProvider = internetServiceProvider; }
}