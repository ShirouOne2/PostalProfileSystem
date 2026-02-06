package com.pps.profilesystem.Entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "zipcode")
@Data
public class ZipCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "zipID")
    private Integer zipID;

    private String province;
    private String city;
    private String barangay;

    private String psgc;

    @Column(name = "unified_zip")
    private String unifiedZip;

    private String zipcode;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Integer getZipID() {
        return zipID;
    }
    
    public void setZipID(Integer zipID) {
        this.zipID = zipID;
    }
    
    public String getProvince() {
        return province;
    }
    
    public void setProvince(String province) {
        this.province = province;
    }
    
    public String getCity() {
        return city;
    }
    
    public void setCity(String city) {
        this.city = city;
    }
    
    public String getBarangay() {
        return barangay;
    }
    
    public void setBarangay(String barangay) {
        this.barangay = barangay;
    }
    
    public String getPsgc() {
        return psgc;
    }
    
    public void setPsgc(String psgc) {
        this.psgc = psgc;
    }
    
    public String getUnifiedZip() {
        return unifiedZip;
    }
    
    public void setUnifiedZip(String unifiedZip) {
        this.unifiedZip = unifiedZip;
    }
    
    public String getZipcode() {
        return zipcode;
    }
    
    public void setZipcode(String zipcode) {
        this.zipcode = zipcode;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    

}
