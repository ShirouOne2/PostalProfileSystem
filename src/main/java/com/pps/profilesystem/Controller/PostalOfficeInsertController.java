package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.*;
import com.pps.profilesystem.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PostalOfficeInsertController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private AreaRepository areaRepository;

    @Autowired
    private RegionRepository regionRepository;

    @Autowired
    private ProvinceRepository provinceRepository;

    @Autowired
    private CityMunicipalityRepository cityMunicipalityRepository;

    @Autowired
    private BarangayRepository barangayRepository;

    /**
     * Get provinces by region ID (cascading dropdown)
     */
    @GetMapping("/provinces/by-region/{regionId}")
    public List<Province> getProvincesByRegion(@PathVariable Integer regionId) {
        return provinceRepository.findByRegionId(regionId);
    }

    /**
     * Get cities/municipalities by province ID (cascading dropdown)
     */
    @GetMapping("/cities/by-province/{provinceId}")
    public List<CityMunicipality> getCitiesByProvince(@PathVariable Integer provinceId) {
        return cityMunicipalityRepository.findByProvinceId(provinceId);
    }

    /**
     * Get barangays by city/municipality ID (cascading dropdown)
     */
    @GetMapping("/barangays/by-city/{cityId}")
    public List<Barangay> getBarangaysByCity(@PathVariable Integer cityId) {
        return barangayRepository.findByCityMunicipalityId(cityId);
    }

    /**
     * Insert new postal office
     */
    @PostMapping("/postal-office/insert")
    public ResponseEntity<?> insertPostalOffice(@RequestBody PostalOfficeDTO dto) {
        try {
            PostalOffice office = new PostalOffice();
            
            // Basic information
            office.setName(dto.getName());
            office.setPostmaster(dto.getPostmaster());
            office.setAddress(dto.getAddress());
            office.setZipCode(dto.getZipCode());
            
            // Location hierarchy - set relationships
            if (dto.getAreaId() != null) {
                areaRepository.findById(dto.getAreaId())
                    .ifPresent(office::setArea);
            }
            
            if (dto.getRegionId() != null) {
                regionRepository.findById(dto.getRegionId())
                    .ifPresent(office::setRegion);
            }
            
            if (dto.getProvinceId() != null) {
                provinceRepository.findById(dto.getProvinceId())
                    .ifPresent(office::setProvince);
            }
            
            if (dto.getCityMunId() != null) {
                cityMunicipalityRepository.findById(dto.getCityMunId())
                    .ifPresent(office::setCityMunicipality);
            }
            
            if (dto.getBarangayId() != null) {
                barangayRepository.findById(dto.getBarangayId())
                    .ifPresent(office::setBarangay);
            }
            
            // Coordinates
            office.setLatitude(dto.getLatitude());
            office.setLongitude(dto.getLongitude());
            
            // Connection status
            office.setConnectionStatus(dto.getConnectionStatus() != null ? dto.getConnectionStatus() : false);
            
            // Save to database
            PostalOffice savedOffice = postalOfficeRepository.save(office);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Postal office added successfully");
            response.put("id", savedOffice.getId());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to add postal office: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * DTO for postal office insertion
     */
    public static class PostalOfficeDTO {
        private String name;
        private String postmaster;
        private String address;
        private String zipCode;
        private Integer areaId;
        private Integer regionId;
        private Integer provinceId;
        private Integer cityMunId;
        private Integer barangayId;
        private Double latitude;
        private Double longitude;
        private Boolean connectionStatus;

        // Getters and Setters
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getPostmaster() { return postmaster; }
        public void setPostmaster(String postmaster) { this.postmaster = postmaster; }

        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }

        public String getZipCode() { return zipCode; }
        public void setZipCode(String zipCode) { this.zipCode = zipCode; }

        public Integer getAreaId() { return areaId; }
        public void setAreaId(Integer areaId) { this.areaId = areaId; }

        public Integer getRegionId() { return regionId; }
        public void setRegionId(Integer regionId) { this.regionId = regionId; }

        public Integer getProvinceId() { return provinceId; }
        public void setProvinceId(Integer provinceId) { this.provinceId = provinceId; }

        public Integer getCityMunId() { return cityMunId; }
        public void setCityMunId(Integer cityMunId) { this.cityMunId = cityMunId; }

        public Integer getBarangayId() { return barangayId; }
        public void setBarangayId(Integer barangayId) { this.barangayId = barangayId; }

        public Double getLatitude() { return latitude; }
        public void setLatitude(Double latitude) { this.latitude = latitude; }

        public Double getLongitude() { return longitude; }
        public void setLongitude(Double longitude) { this.longitude = longitude; }

        public Boolean getConnectionStatus() { return connectionStatus; }
        public void setConnectionStatus(Boolean connectionStatus) { this.connectionStatus = connectionStatus; }
    }
}