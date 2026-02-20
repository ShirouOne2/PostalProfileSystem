package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.*;
import com.pps.profilesystem.Service.PostalOfficeService;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Repository.ConnectivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * REST Controller for editing postal offices
 * Provides GET (single office) and PUT (update) endpoints
 */
@RestController
@RequestMapping("/api")
public class PostalOfficeEditController {

    @Autowired
    private PostalOfficeService postalOfficeService;

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private ConnectivityRepository connectivityRepository;

    /**
     * Upload profile picture or cover photo for a postal office
     */
    @PostMapping("/postal-office/{id}/upload-image")
    public ResponseEntity<Map<String, Object>> uploadImage(
            @PathVariable Integer id,
            @RequestParam("type") String type,
            @RequestParam("file") MultipartFile file) {

        Map<String, Object> response = new HashMap<>();

        try {
            Optional<PostalOffice> officeOptional = postalOfficeService.getPostalOfficeById(id);
            if (officeOptional.isEmpty()) {
                response.put("success", false);
                response.put("message", "Post office not found.");
                return ResponseEntity.status(404).body(response);
            }

            // Validate file type
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                response.put("success", false);
                response.put("message", "Only image files are allowed.");
                return ResponseEntity.badRequest().body(response);
            }

            // Save file to /uploads/offices/
            String uploadDir = "src/main/resources/static/uploads/offices/";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = (originalFilename != null && originalFilename.contains("."))
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : ".jpg";
            String filename = type + "_" + id + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;
            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "/uploads/offices/" + filename;

            PostalOffice office = officeOptional.get();
            if ("profile".equals(type)) {
                office.setProfilePicture(fileUrl);
            } else if ("cover".equals(type)) {
                office.setCoverPhoto(fileUrl);
            } else {
                response.put("success", false);
                response.put("message", "Invalid image type. Use 'profile' or 'cover'.");
                return ResponseEntity.badRequest().body(response);
            }

            postalOfficeRepository.save(office);

            response.put("success", true);
            response.put("message", "Image uploaded successfully.");
            response.put("url", fileUrl);
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            response.put("success", false);
            response.put("message", "Failed to upload image: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Get a single postal office by ID for editing
     */
    @GetMapping("/postal-office/{id}")
    public ResponseEntity<Map<String, Object>> getPostalOfficeById(@PathVariable Integer id) {
        try {
            Optional<PostalOffice> officeOptional = postalOfficeService.getPostalOfficeById(id);

            if (officeOptional.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Post office not found with ID: " + id);
                return ResponseEntity.status(404).body(response);
            }

            PostalOffice office = officeOptional.get();
            return ResponseEntity.ok(convertToEditDTO(office));

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to fetch post office: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Update a postal office
     */
    @PutMapping("/postal-office/{id}")
    public ResponseEntity<Map<String, Object>> updatePostalOffice(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> requestData) {
        try {
            Optional<PostalOffice> officeOptional = postalOfficeService.getPostalOfficeById(id);

            if (officeOptional.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Post office not found with ID: " + id);
                return ResponseEntity.status(404).body(response);
            }

            PostalOffice office = officeOptional.get();

            // Update basic information
            if (requestData.containsKey("name")) office.setName((String) requestData.get("name"));
            if (requestData.containsKey("postmaster")) office.setPostmaster((String) requestData.get("postmaster"));
            if (requestData.containsKey("address")) office.setAddress((String) requestData.get("address"));
            if (requestData.containsKey("zipCode")) office.setZipCode((String) requestData.get("zipCode"));

            // ============================================================
            // CONNECTION STATUS CHANGE LOGIC
            // Source of truth: connectionStatus boolean sa postal_offices table
            // ============================================================
            if (requestData.containsKey("connectionStatus")) {
                Object statusVal = requestData.get("connectionStatus");
                Boolean newStatus;
                if (statusVal instanceof Boolean) {
                    newStatus = (Boolean) statusVal;
                } else if (statusVal instanceof String) {
                    String s = (String) statusVal;
                    newStatus = s.equalsIgnoreCase("true") || s.equalsIgnoreCase("Active");
                } else {
                    newStatus = false;
                }
                Boolean oldStatus = office.getConnectionStatus(); // boolean sa postal_offices table

                office.setConnectionStatus(newStatus);

                if (!Boolean.TRUE.equals(oldStatus) && Boolean.TRUE.equals(newStatus)) {
                    // -------------------------
                    // INACTIVE Ã¢â€ â€™ ACTIVE
                    // Reuse existing connectivity record instead of creating new one
                    // Find the most recent connectivity record and reactivate it
                    // -------------------------
                    List<Connectivity> history = connectivityRepository.findByPostalOfficeId(office.getId());
                    
                    // Find the most recently disconnected connectivity record
                    Connectivity existingConn = history.stream()
                            .filter(c -> c.getDateDisconnected() != null) // Find disconnected records
                            .max((c1, c2) -> c1.getDateDisconnected().compareTo(c2.getDateDisconnected())) // Get most recent
                            .orElse(null);
                    
                    if (existingConn != null) {
                        // Reactivate the existing connectivity record
                        existingConn.setDateConnected(LocalDateTime.now());
                        existingConn.setDateDisconnected(null);
                        connectivityRepository.save(existingConn);
                        office.setActiveConnectivity(existingConn);
                    } else {
                        // If no existing record found, create new one (fallback)
                        Connectivity newConn = new Connectivity();
                        newConn.setPostalOffice(office);
                        newConn.setDateConnected(LocalDateTime.now());
                        newConn.setDateDisconnected(null);

                        // Try to reuse provider from any connectivity record of this office
                        history.stream()
                                .filter(c -> c.getProvider() != null)
                                .findFirst()
                                .ifPresent(c -> newConn.setProvider(c.getProvider()));
                        
                        if (newConn.getProvider() == null) {
                            throw new RuntimeException("No provider found for this office.");
                        }

                        Connectivity savedConn = connectivityRepository.save(newConn);
                        office.setActiveConnectivity(savedConn);
                    }
                } else if (Boolean.TRUE.equals(oldStatus) && !Boolean.TRUE.equals(newStatus)) {
                    // -------------------------
                    // ACTIVE Ã¢â€ â€™ INACTIVE
                    // dateConnected = null, dateDisconnected = now
                    // connectivity_id = NULL
                    // -------------------------
                    Connectivity activeConn = office.getActiveConnectivity();
                    if (activeConn != null) {
                        activeConn.setDateConnected(null);
                        activeConn.setDateDisconnected(LocalDateTime.now());
                        connectivityRepository.save(activeConn);
                        office.setActiveConnectivity(null); // connectivity_id = NULL
                    }
                }
            }

            // Update ISP information
            if (requestData.containsKey("internetServiceProvider")) office.setInternetServiceProvider((String) requestData.get("internetServiceProvider"));
            if (requestData.containsKey("speed")) office.setSpeed((String) requestData.get("speed"));
            if (requestData.containsKey("typeOfConnection")) office.setTypeOfConnection((String) requestData.get("typeOfConnection"));
            if (requestData.containsKey("staticIpAddress")) office.setStaticIpAddress((String) requestData.get("staticIpAddress"));

            // Update staff information
            if (requestData.containsKey("noOfEmployees")) {
                Object val = requestData.get("noOfEmployees");
                if (val instanceof Number) office.setNoOfEmployees(((Number) val).intValue());
                else if (val instanceof String && !((String) val).isBlank()) office.setNoOfEmployees(Integer.parseInt((String) val));
            }
            if (requestData.containsKey("noOfPostalTellers")) {
                Object val = requestData.get("noOfPostalTellers");
                if (val instanceof Number) office.setNoOfPostalTellers(((Number) val).intValue());
                else if (val instanceof String && !((String) val).isBlank()) office.setNoOfPostalTellers(Integer.parseInt((String) val));
            }
            if (requestData.containsKey("noOfLetterCarriers")) {
                Object val = requestData.get("noOfLetterCarriers");
                if (val instanceof Number) office.setNoOfLetterCarriers(((Number) val).intValue());
                else if (val instanceof String && !((String) val).isBlank()) office.setNoOfLetterCarriers(Integer.parseInt((String) val));
            }

            // Update contact information
            if (requestData.containsKey("postalOfficeContactPerson")) office.setPostalOfficeContactPerson((String) requestData.get("postalOfficeContactPerson"));
            if (requestData.containsKey("postalOfficeContactNumber")) office.setPostalOfficeContactNumber((String) requestData.get("postalOfficeContactNumber"));
            if (requestData.containsKey("ispContactPerson")) office.setIspContactPerson((String) requestData.get("ispContactPerson"));
            if (requestData.containsKey("ispContactNumber")) office.setIspContactNumber((String) requestData.get("ispContactNumber"));

            // Update coordinates
            if (requestData.containsKey("latitude")) {
                Object latObj = requestData.get("latitude");
                if (latObj instanceof Number) office.setLatitude(((Number) latObj).doubleValue());
                else if (latObj instanceof String && !((String) latObj).isBlank()) office.setLatitude(Double.parseDouble((String) latObj));
            }
            if (requestData.containsKey("longitude")) {
                Object lngObj = requestData.get("longitude");
                if (lngObj instanceof Number) office.setLongitude(((Number) lngObj).doubleValue());
                else if (lngObj instanceof String && !((String) lngObj).isBlank()) office.setLongitude(Double.parseDouble((String) lngObj));
            }

            // Update classification and services
            if (requestData.containsKey("classification")) office.setClassification((String) requestData.get("classification"));
            if (requestData.containsKey("serviceProvided")) office.setServiceProvided((String) requestData.get("serviceProvided"));

            // Save the updated office
            PostalOffice updatedOffice = postalOfficeRepository.save(office);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Post office updated successfully");
            response.put("id", updatedOffice.getId());
            response.put("name", updatedOffice.getName());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to update post office: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Convert PostalOffice entity to a Map suitable for editing
     */
    private Map<String, Object> convertToEditDTO(PostalOffice office) {
        Map<String, Object> data = new HashMap<>();

        data.put("id", office.getId());
        data.put("name", office.getName());
        data.put("postmaster", office.getPostmaster());
        data.put("address", office.getAddress());
        data.put("zipCode", office.getZipCode());

        if (office.getArea() != null) { data.put("areaId", office.getArea().getId()); data.put("areaName", office.getArea().getAreaName()); }
        if (office.getRegion() != null) { data.put("regionId", office.getRegion().getId()); data.put("regionName", office.getRegion().getName()); }
        if (office.getProvince() != null) { data.put("provinceId", office.getProvince().getId()); data.put("provinceName", office.getProvince().getName()); }
        if (office.getCityMunicipality() != null) { data.put("cityMunicipalityId", office.getCityMunicipality().getId()); data.put("cityMunicipalityName", office.getCityMunicipality().getName()); }
        if (office.getBarangay() != null) { data.put("barangayId", office.getBarangay().getId()); data.put("barangayName", office.getBarangay().getName()); }

        data.put("latitude", office.getLatitude());
        data.put("longitude", office.getLongitude());

        // connectionStatus - source of truth para sa active/inactive
        data.put("connectionStatus", office.getConnectionStatus());

        data.put("internetServiceProvider", office.getInternetServiceProvider());
        data.put("typeOfConnection", office.getTypeOfConnection());
        data.put("speed", office.getSpeed());
        data.put("staticIpAddress", office.getStaticIpAddress());
        data.put("noOfEmployees", office.getNoOfEmployees());
        data.put("noOfPostalTellers", office.getNoOfPostalTellers());
        data.put("noOfLetterCarriers", office.getNoOfLetterCarriers());
        data.put("classification", office.getClassification());
        data.put("serviceProvided", office.getServiceProvided());
        data.put("postalOfficeContactPerson", office.getPostalOfficeContactPerson());
        data.put("postalOfficeContactNumber", office.getPostalOfficeContactNumber());
        data.put("ispContactPerson", office.getIspContactPerson());
        data.put("ispContactNumber", office.getIspContactNumber());
        data.put("profilePicture", office.getProfilePicture());
        data.put("coverPhoto", office.getCoverPhoto());

        return data;
    }
}