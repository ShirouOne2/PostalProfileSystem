package com.pps.profilesystem.DTO;

import java.time.LocalDateTime;

public class PostalOfficeImportDTO {

    // Col 0
    private String area;
    // Col 1
    private String postOfficeName;
    // Col 2
    private String postmaster;
    // Col 3 - read as Double first, then cast to Integer
    private Integer noOfEmployees;
    // Col 4
    private Double longitude;
    // Col 5
    private Double latitude;
    // Col 6 - Image_Path: IGNORED (no entity field)
    // Col 7 - Local_Path: IGNORED (no entity field)
    // Col 8
    private String regionName;
    // Col 9
    private String provinceName;
    // Col 10
    private String cityMunicipalityName;
    // Col 11
    private String barangayName;
    // Col 12
    private String zipCode;
    // Col 13
    private String address;
    // Col 14
    private String serviceProvided;
    // Col 15
    private String classification;
    // Col 16
    private String connectivityStatus;
    // Col 17
    private String internetServiceProvider;
    // Col 18
    private String typeOfConnection;
    // Col 19
    private String speed;
    // Col 20
    private String staticIpAddress;
    // Col 21
    private String postalOfficeContactPerson;
    // Col 22
    private String postalOfficeContactNumber;
    // Col 23
    private String ispContactPerson;
    // Col 24 - ISP contact number
    private String ispContactNumber;
    // Col 25
    private LocalDateTime dateConnected;
    // Col 26
    private LocalDateTime dateDisconnected;

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public String getArea() { return area; }
    public void setArea(String area) { this.area = area; }

    public String getPostOfficeName() { return postOfficeName; }
    public void setPostOfficeName(String postOfficeName) { this.postOfficeName = postOfficeName; }

    public String getPostmaster() { return postmaster; }
    public void setPostmaster(String postmaster) { this.postmaster = postmaster; }

    public Integer getNoOfEmployees() { return noOfEmployees; }
    public void setNoOfEmployees(Integer noOfEmployees) { this.noOfEmployees = noOfEmployees; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public String getRegionName() { return regionName; }
    public void setRegionName(String regionName) { this.regionName = regionName; }

    public String getProvinceName() { return provinceName; }
    public void setProvinceName(String provinceName) { this.provinceName = provinceName; }

    public String getCityMunicipalityName() { return cityMunicipalityName; }
    public void setCityMunicipalityName(String cityMunicipalityName) { this.cityMunicipalityName = cityMunicipalityName; }

    public String getBarangayName() { return barangayName; }
    public void setBarangayName(String barangayName) { this.barangayName = barangayName; }

    public String getZipCode() { return zipCode; }
    public void setZipCode(String zipCode) { this.zipCode = zipCode; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getServiceProvided() { return serviceProvided; }
    public void setServiceProvided(String serviceProvided) { this.serviceProvided = serviceProvided; }

    public String getClassification() { return classification; }
    public void setClassification(String classification) { this.classification = classification; }

    public String getConnectivityStatus() { return connectivityStatus; }
    public void setConnectivityStatus(String connectivityStatus) { this.connectivityStatus = connectivityStatus; }

    public String getInternetServiceProvider() { return internetServiceProvider; }
    public void setInternetServiceProvider(String isp) { this.internetServiceProvider = isp; }

    public String getTypeOfConnection() { return typeOfConnection; }
    public void setTypeOfConnection(String typeOfConnection) { this.typeOfConnection = typeOfConnection; }

    public String getSpeed() { return speed; }
    public void setSpeed(String speed) { this.speed = speed; }

    public String getStaticIpAddress() { return staticIpAddress; }
    public void setStaticIpAddress(String staticIpAddress) { this.staticIpAddress = staticIpAddress; }

    public String getPostalOfficeContactPerson() { return postalOfficeContactPerson; }
    public void setPostalOfficeContactPerson(String p) { this.postalOfficeContactPerson = p; }

    public String getPostalOfficeContactNumber() { return postalOfficeContactNumber; }
    public void setPostalOfficeContactNumber(String p) { this.postalOfficeContactNumber = p; }

    public String getIspContactPerson() { return ispContactPerson; }
    public void setIspContactPerson(String ispContactPerson) { this.ispContactPerson = ispContactPerson; }

    public String getIspContactNumber() { return ispContactNumber; }
    public void setIspContactNumber(String ispContactNumber) { this.ispContactNumber = ispContactNumber; }

    public LocalDateTime getDateConnected() { return dateConnected; }
    public void setDateConnected(LocalDateTime dateConnected) { this.dateConnected = dateConnected; }

    public LocalDateTime getDateDisconnected() { return dateDisconnected; }
    public void setDateDisconnected(LocalDateTime dateDisconnected) { this.dateDisconnected = dateDisconnected; }
}