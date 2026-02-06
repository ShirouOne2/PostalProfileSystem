package com.pps.profilesystem.DTO;

public class PostalOfficeImportDTO {
    private String area;              // AREA (REQUIRED)
    private String postOfficeName;    // POSTAL OFFICE NAME (REQUIRED)
    private Double longitude;         // LONGITUDE (optional)
    private Double latitude;          // LATITUDE (optional)
    private String zipCode;           // ZIP CODE (optional)
    private String address;           // ADDRESS LINE1 (optional)
    private String connectivityStatus; // CONNECTIVITY STATUS (optional)
    
    // getters and setters
    public String getArea() {
        return area;
    }
    
    public void setArea(String area) {
        this.area = area;
    }
    
    public String getPostOfficeName() {
        return postOfficeName;
    }
    
    public void setPostOfficeName(String postOfficeName) {
        this.postOfficeName = postOfficeName;
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
    
    public String getZipCode() {
        return zipCode;
    }
    
    public void setZipCode(String zipCode) {
        this.zipCode = zipCode;
    }
    
    public String getAddress() {
        return address;
    }
    
    public void setAddress(String address) {
        this.address = address;
    }
    
    public String getConnectivityStatus() {
        return connectivityStatus;
    }
    
    public void setConnectivityStatus(String connectivityStatus) {
        this.connectivityStatus = connectivityStatus;
    }
}