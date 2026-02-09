package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.*;
import com.pps.profilesystem.Service.LocationHierarchyService;
import com.pps.profilesystem.Service.PostalOfficeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST Controller for inserting/creating postal offices
 * Uses services instead of direct repository access
 */
@RestController
@RequestMapping("/api")
public class PostalOfficeInsertController {

    @Autowired
    private PostalOfficeService postalOfficeService;

    @Autowired
    private LocationHierarchyService locationService;

    /**
     * Get provinces by region ID (cascading dropdown)
     */
    @GetMapping("/provinces/by-region/{regionId}")
    public List<Province> getProvincesByRegion(@PathVariable Integer regionId) {
        return locationService.getProvincesByRegion(regionId);
    }

    /**
     * Get cities/municipalities by province ID (cascading dropdown)
     */
    @GetMapping("/cities/by-province/{provinceId}")
    public List<CityMunicipality> getCitiesByProvince(@PathVariable Integer provinceId) {
        return locationService.getCitiesByProvince(provinceId);
    }

    /**
     * Get barangays by city/municipality ID (cascading dropdown)
     */
    @GetMapping("/barangays/by-city/{cityId}")
    public List<Barangay> getBarangaysByCity(@PathVariable Integer cityId) {
        return locationService.getBarangaysByCity(cityId);
    }

    /**
     * Insert new postal office
     * Accepts request body and builds PostalOffice entity
     */
    @PostMapping("/postal-office/insert")
    public ResponseEntity<Map<String, Object>> insertPostalOffice(@RequestBody Map<String, Object> requestData) {
        try {
            PostalOffice office = buildPostalOfficeFromRequest(requestData);
            PostalOffice savedOffice = postalOfficeService.createPostalOffice(office);
            
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
     * Helper method to build PostalOffice entity from request data
     */
    private PostalOffice buildPostalOfficeFromRequest(Map<String, Object> data) {
        PostalOffice office = new PostalOffice();
        
        // Basic information
        office.setName((String) data.get("name"));
        office.setPostmaster((String) data.get("postmaster"));
        office.setAddress((String) data.get("address"));
        office.setZipCode((String) data.get("zipCode"));
        
        // Location hierarchy - set relationships using service
        setLocationHierarchy(office, data);
        
        // Coordinates
        if (data.get("latitude") != null) {
            office.setLatitude(parseDouble(data.get("latitude")));
        }
        if (data.get("longitude") != null) {
            office.setLongitude(parseDouble(data.get("longitude")));
        }
        
        // Connection status
        Boolean connectionStatus = (Boolean) data.get("connectionStatus");
        office.setConnectionStatus(connectionStatus != null ? connectionStatus : false);
        
        return office;
    }

    /**
     * Set location hierarchy relationships on postal office
     */
    private void setLocationHierarchy(PostalOffice office, Map<String, Object> data) {
        Integer areaId = parseInteger(data.get("areaId"));
        Integer regionId = parseInteger(data.get("regionId"));
        Integer provinceId = parseInteger(data.get("provinceId"));
        Integer cityMunId = parseInteger(data.get("cityMunId"));
        Integer barangayId = parseInteger(data.get("barangayId"));
        
        if (areaId != null) {
            locationService.getAllAreas().stream()
                .filter(a -> a.getId().equals(areaId))
                .findFirst()
                .ifPresent(office::setArea);
        }
        
        if (regionId != null) {
            locationService.getAllRegions().stream()
                .filter(r -> r.getId().equals(regionId))
                .findFirst()
                .ifPresent(office::setRegion);
        }
        
        if (provinceId != null) {
            locationService.getProvincesByRegion(regionId).stream()
                .filter(p -> p.getId().equals(provinceId))
                .findFirst()
                .ifPresent(office::setProvince);
        }
        
        if (cityMunId != null) {
            locationService.getCitiesByProvince(provinceId).stream()
                .filter(c -> c.getId().equals(cityMunId))
                .findFirst()
                .ifPresent(office::setCityMunicipality);
        }
        
        if (barangayId != null) {
            locationService.getBarangaysByCity(cityMunId).stream()
                .filter(b -> b.getId().equals(barangayId))
                .findFirst()
                .ifPresent(office::setBarangay);
        }
    }

    /**
     * Helper to parse Integer from Object
     */
    private Integer parseInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Integer) return (Integer) value;
        if (value instanceof String) {
            try {
                return Integer.parseInt((String) value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Helper to parse Double from Object
     */
    private Double parseDouble(Object value) {
        if (value == null) return null;
        if (value instanceof Double) return (Double) value;
        if (value instanceof Integer) return ((Integer) value).doubleValue();
        if (value instanceof String) {
            try {
                return Double.parseDouble((String) value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}