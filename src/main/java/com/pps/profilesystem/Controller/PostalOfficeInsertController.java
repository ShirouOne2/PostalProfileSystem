package com.pps.profilesystem.Controller;

import com.pps.profilesystem.DTO.BarangayDTO;
import com.pps.profilesystem.DTO.CityMunicipalityDTO;
import com.pps.profilesystem.DTO.ProvinceDTO;
import com.pps.profilesystem.Entity.*;
import com.pps.profilesystem.Service.LocationHierarchyService;
import com.pps.profilesystem.Service.PostalOfficeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST Controller for inserting/creating postal offices
 */
@RestController
@RequestMapping("/api")
public class PostalOfficeInsertController {

    @Autowired
    private PostalOfficeService postalOfficeService;

    @Autowired
    private LocationHierarchyService locationService;

    @GetMapping("/provinces/by-region/{regionId}")
    public ResponseEntity<?> getProvincesByRegion(@PathVariable Integer regionId) {
        try {
            List<Province> provinces = locationService.getProvincesByRegion(regionId);
            
            // Convert to DTOs to avoid lazy loading issues
            List<ProvinceDTO> provinceDTOs = provinces.stream()
                .map(p -> new ProvinceDTO(p.getId(), p.getName()))
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(provinceDTOs);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to load provinces: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/cities/by-province/{provinceId}")
    public ResponseEntity<?> getCitiesByProvince(@PathVariable Integer provinceId) {
        try {
            List<CityMunicipality> cities = locationService.getCitiesByProvince(provinceId);
            
            // Convert to DTOs to avoid lazy loading issues
            List<CityMunicipalityDTO> cityDTOs = cities.stream()
                .map(c -> new CityMunicipalityDTO(c.getId(), c.getName()))
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(cityDTOs);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to load cities: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/barangays/by-city/{cityId}")
    public ResponseEntity<?> getBarangaysByCity(@PathVariable Integer cityId) {
        try {
            List<Barangay> barangays = locationService.getBarangaysByCity(cityId);
            
            // Convert to DTOs to avoid lazy loading issues
            List<BarangayDTO> barangayDTOs = barangays.stream()
                .map(b -> new BarangayDTO(b.getId(), b.getName()))
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(barangayDTOs);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to load barangays: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

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
     * Helper method to safely parse Integer from Object (handles both String and Integer)
     */
    private Integer parseInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Integer) {
            return (Integer) value;
        }
        if (value instanceof String) {
            try {
                return Integer.parseInt((String) value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return null;
    }

    private PostalOffice buildPostalOfficeFromRequest(Map<String, Object> requestData) {
        PostalOffice office = new PostalOffice();
        
        // Basic Information - safely convert to String in case value is not a raw String
        if (requestData.get("name") != null) {
            office.setName(requestData.get("name").toString());
        }
        if (requestData.get("postmaster") != null) {
            office.setPostmaster(requestData.get("postmaster").toString());
        }
        if (requestData.get("address") != null) {
            office.setAddress(requestData.get("address").toString());
        }
        if (requestData.get("zipCode") != null) {
            office.setZipCode(requestData.get("zipCode").toString());
        }
        
        // Location Hierarchy - set entities based on IDs
        if (requestData.get("areaId") != null) {
            Integer areaId = parseInteger(requestData.get("areaId"));
            if (areaId != null) {
                locationService.getAllAreas().stream()
                    .filter(a -> a.getId().equals(areaId))
                    .findFirst()
                    .ifPresent(office::setArea);
            }
        }
        
        if (requestData.get("regionId") != null) {
            Integer regionId = parseInteger(requestData.get("regionId"));
            if (regionId != null) {
                locationService.getAllRegions().stream()
                    .filter(r -> r.getId().equals(regionId))
                    .findFirst()
                    .ifPresent(office::setRegion);
            }
        }
        
        if (requestData.get("provinceId") != null) {
            Integer provinceId = parseInteger(requestData.get("provinceId"));
            Integer regionId = parseInteger(requestData.get("regionId"));
            if (provinceId != null && regionId != null) {
                locationService.getProvincesByRegion(regionId).stream()
                    .filter(p -> p.getId().equals(provinceId))
                    .findFirst()
                    .ifPresent(office::setProvince);
            }
        }
        
        if (requestData.get("cityMunId") != null) {
            Integer cityMunId = parseInteger(requestData.get("cityMunId"));
            Integer provinceId = parseInteger(requestData.get("provinceId"));
            if (cityMunId != null && provinceId != null) {
                locationService.getCitiesByProvince(provinceId).stream()
                    .filter(c -> c.getId().equals(cityMunId))
                    .findFirst()
                    .ifPresent(office::setCityMunicipality);
            }
        }
        
        if (requestData.get("barangayId") != null) {
            Integer barangayId = parseInteger(requestData.get("barangayId"));
            Integer cityMunId = parseInteger(requestData.get("cityMunId"));
            if (barangayId != null && cityMunId != null) {
                locationService.getBarangaysByCity(cityMunId).stream()
                    .filter(b -> b.getId().equals(barangayId))
                    .findFirst()
                    .ifPresent(office::setBarangay);
            }
        }
        
        // Coordinates - safely parse Double regardless of whether JSON sends a number or string
        if (requestData.get("latitude") != null) {
            Object latObj = requestData.get("latitude");
            try {
                if (latObj instanceof Number) {
                    office.setLatitude(((Number) latObj).doubleValue());
                } else if (latObj instanceof String && !((String) latObj).isEmpty()) {
                    office.setLatitude(Double.parseDouble((String) latObj));
                }
            } catch (NumberFormatException ignored) { }
        }
        if (requestData.get("longitude") != null) {
            Object lngObj = requestData.get("longitude");
            try {
                if (lngObj instanceof Number) {
                    office.setLongitude(((Number) lngObj).doubleValue());
                } else if (lngObj instanceof String && !((String) lngObj).isEmpty()) {
                    office.setLongitude(Double.parseDouble((String) lngObj));
                }
            } catch (NumberFormatException ignored) { }
        }
        
        // Connection Status - safely parse Boolean regardless of whether JSON sends true/false or "true"/"false"
        Object statusVal = requestData.get("connectionStatus");
        if (statusVal instanceof Boolean) {
            office.setConnectionStatus((Boolean) statusVal);
        } else if (statusVal instanceof String) {
            office.setConnectionStatus(Boolean.parseBoolean((String) statusVal));
        } else {
            office.setConnectionStatus(false); // Default to false
        }
        
        return office;
    }
}