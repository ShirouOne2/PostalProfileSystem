package com.pps.profilesystem.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "postal_offices")
@Data
public class PostalOffice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;
    private String postmaster;
    
    @Column(columnDefinition = "TEXT")
    private String address;

    @ManyToOne
    @JoinColumn(name = "area_id", nullable = true)
    private Area area;

    @ManyToOne
    @JoinColumn(name = "region_id", nullable = true)
    private Regions region;  // Changed from 'regions' to 'region'

    @ManyToOne
    @JoinColumn(name = "province_id", nullable = true)
    private Province province;

    @ManyToOne
    @JoinColumn(name = "city_mun_id", nullable = true)
    private CityMunicipality cityMunicipality;

    @ManyToOne
    @JoinColumn(name = "barangay_id", nullable = true)
    private Barangay barangay;

    private String zipCode;
    
    // Remove precision and scale - just use Double for MySQL DOUBLE type
    private Double longitude;
    private Double latitude;
    
    @Column(name = "connection_status")
    private Boolean connectionStatus = false;

    public Integer getId() {
        return id;
    }
    
    public void setId(Integer id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getPostmaster() {
        return postmaster;
    }
    
    public void setPostmaster(String postmaster) {
        this.postmaster = postmaster;
    }
    
    public String getAddress() {
        return address;
    }
    
    public void setAddress(String address) {
        this.address = address;
    }
    
    public Area getArea() {
        return area;
    }
    
    public void setArea(Area area) {
        this.area = area;
    }
    
    public Regions getRegion() {
        return region;
    }
    
    public void setRegion(Regions region) {
        this.region = region;
    }
    
    public Province getProvince() {
        return province;
    }
    
    public void setProvince(Province province) {
        this.province = province;
    }
    
    public CityMunicipality getCityMunicipality() {
        return cityMunicipality;
    }
    
    public void setCityMunicipality(CityMunicipality cityMunicipality) {
        this.cityMunicipality = cityMunicipality;
    }
    
    public Barangay getBarangay() {
        return barangay;
    }
    
    public void setBarangay(Barangay barangay) {
        this.barangay = barangay;
    }
    
    public String getZipCode() {
        return zipCode;
    }
    
    public void setZipCode(String zipCode) {
        this.zipCode = zipCode;
    }
    
    public Double getLongitude() {
        return longitude;
    }
    
    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }
    
    public Double getLatitude() {
        return latitude;
    }
    
    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }
    
    public Boolean getConnectionStatus() {
        return connectionStatus;
    }
    
    public void setConnectionStatus(Boolean connectionStatus) {
        this.connectionStatus = connectionStatus;
    }
}