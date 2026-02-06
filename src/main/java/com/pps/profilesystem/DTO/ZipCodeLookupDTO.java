package com.pps.profilesystem.DTO;

public class ZipCodeLookupDTO {
    private String province;
    private String city;
    private String barangay;
    
    // getters and setters
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
}