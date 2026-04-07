package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.Month;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * REST Controller for map-related postal office data
 * Returns postal offices with coordinates for map visualization
 *
 * FIX: Wrapped all DB calls in try-catch so a missing column (e.g. office_status)
 *      returns an empty JSON array + logs the error instead of an HTML 500 page.
 *      The real fix is to run fix_office_status.sql in your database.
 */
@RestController
@RequestMapping("/api")
public class MapController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private UserRepository userRepository;

    // ── /api/post-offices  (dashboard map) ───────────────────────────────────

    @GetMapping("/post-offices")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getPostOffices() {
        try {
            // Get the logged-in user for area filtering
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email = auth.getName();
            User currentUser = userRepository.findByEmail(email).orElse(null);

            Integer roleId = currentUser != null ? currentUser.getRole() : null;
            Integer areaId = currentUser != null ? currentUser.getAreaId() : null;

            List<PostalOffice> offices;
            
            if (roleId != null && roleId == 1) {
                // System Admin sees all offices
                offices = postalOfficeRepository.findAllWithAreaForMapNonArchived();
            } else {
                // Area Admin and regular users see only offices in their assigned area
                offices = postalOfficeRepository.findAllWithAreaForMapNonArchived()
            System.out.println("[MapController] Attempting to fetch post offices...");
            List<Map<String, Object>> result =
                postalOfficeRepository.findAllWithAreaForMapNonArchived()
                    .stream()
                    .filter(po -> {
                        if (areaId == null) return false;
                        return po.getArea() != null && areaId.equals(po.getArea().getId());
                    })
                    .collect(Collectors.toList());
            }

            List<Map<String, Object>> result = offices.stream()
                .map(this::convertToMapDTO)
                .collect(Collectors.toList());
            
            System.out.println("[MapController] Successfully fetched " + result.size() + " offices");
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            // Log the real error so you can see it in the console
            System.err.println("[MapController] /api/post-offices ERROR: " + e.getMessage());
            System.err.println("[MapController] Error type: " + e.getClass().getSimpleName());
            e.printStackTrace();
            
            // Try fallback method if main query fails
            try {
                System.out.println("[MapController] Trying fallback method...");
                List<Map<String, Object>> fallbackResult =
                    postalOfficeRepository.findAllNonArchivedWithConnectivity()
                        .stream()
                        .filter(po -> po.getLatitude() != null && po.getLongitude() != null)
                        .map(this::convertToMapDTO)
                        .collect(Collectors.toList());
                System.out.println("[MapController] Fallback method fetched " + fallbackResult.size() + " offices");
                return ResponseEntity.ok(fallbackResult);
            } catch (Exception fallbackError) {
                System.err.println("[MapController] Fallback also failed: " + fallbackError.getMessage());
                fallbackError.printStackTrace();
                // Return empty list — JS map will just show no markers (no crash)
                return ResponseEntity.ok(Collections.emptyList());
            }
        }
    }

    // ── /api/post-offices/all  (quarters / report map) ───────────────────────

    @GetMapping("/post-offices/all")
    public ResponseEntity<List<Map<String, Object>>> getAllPostOffices(
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String quarter,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String status) {
        try {
            List<Map<String, Object>> offices = resolveOffices(year, quarter, area, status);
            return ResponseEntity.ok(offices);
        } catch (Exception e) {
            System.err.println("[MapController] /api/post-offices/all ERROR: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    // ── /api/post-offices/debug  (debug endpoint) ───────────────────────────────

    @GetMapping("/post-offices/debug")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> debugPostOffices() {
        Map<String, Object> debug = new java.util.HashMap<>();
        try {
            // Check total count
            long totalCount = postalOfficeRepository.count();
            debug.put("total_offices", totalCount);
            
            // Check non-archived count
            long nonArchivedCount = postalOfficeRepository.countNonArchived();
            debug.put("non_archived_offices", nonArchivedCount);
            
            // Check offices with coordinates
            List<Map<String, Object>> withCoords = postalOfficeRepository.findAllNonArchivedWithConnectivity()
                .stream()
                .filter(po -> po.getLatitude() != null && po.getLongitude() != null)
                .map(po -> {
                    Map<String, Object> basic = new java.util.HashMap<>();
                    basic.put("id", po.getId());
                    basic.put("name", po.getName());
                    basic.put("lat", po.getLatitude());
                    basic.put("lng", po.getLongitude());
                    basic.put("area", po.getArea() != null ? po.getArea().getAreaName() : null);
                    return basic;
                })
                .limit(5) // Limit to first 5 for debugging
                .collect(Collectors.toList());
            debug.put("offices_with_coordinates", withCoords);
            debug.put("offices_with_coordinates_count", withCoords.size());
            
            return ResponseEntity.ok(debug);
        } catch (Exception e) {
            debug.put("error", e.getMessage());
            debug.put("error_type", e.getClass().getSimpleName());
            return ResponseEntity.ok(debug);
        }
    }

    // ── /api/postal-office/{id}/profile  (profile modal) ───────────────────────

    @GetMapping("/postal-office/{id}/profile")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getPostalOfficeProfile(@PathVariable Integer id) {
        try {
            Optional<com.pps.profilesystem.Entity.PostalOffice> officeOpt = postalOfficeRepository.findById(id);
            if (officeOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            com.pps.profilesystem.Entity.PostalOffice office = officeOpt.get();
            Map<String, Object> profile = convertToProfileDTO(office);
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            System.err.println("[MapController] /api/postal-office/" + id + "/profile ERROR: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── /api/post-offices/search ───────────────────────────────────────────────

    @GetMapping("/post-offices/search")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> searchPostOffices(@RequestParam String q) {
        try {
            List<Map<String, Object>> result = postalOfficeRepository.findAllNonArchivedWithConnectivity()
                    .stream()
                    .filter(office -> office.getName() != null && 
                            office.getName().toLowerCase().contains(q.toLowerCase()))
                    .map(this::convertToMapDTO)
                    .limit(10) // Limit to 10 results for performance
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("[MapController] /api/post-offices/search ERROR: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    // ── Resolution logic (extracted for clarity) ─────────────────────────────

    private List<Map<String, Object>> resolveOffices(
            String year, String quarter, String area, String status) {

        if (year == null && quarter == null && area == null && status == null) {
            return postalOfficeRepository.findAllNonArchivedWithConnectivity()
                .stream().map(this::convertToMapDTO).collect(Collectors.toList());
        }

        Integer yearInt    = parseInteger(year);
        Integer quarterInt = parseQuarter(quarter);
        Integer areaInt    = parseInteger(area);

        if (yearInt != null && quarterInt != null) {
            LocalDateTime[] range = getQuarterDateRange(yearInt, quarterInt);
            String type = (status != null && status.equals("newly_disconnected")) ? "disconnected" : "connected";
            return getPostOfficesByDateRange(range[0], range[1], type, status);
        }

        if (yearInt != null && status != null &&
                (status.equals("newly_connected") || status.equals("newly_disconnected"))) {
            LocalDateTime now = LocalDateTime.now();
            int currentQ      = (now.getMonthValue() - 1) / 3 + 1;
            LocalDateTime[] range = getQuarterDateRange(yearInt, currentQ);
            String type = status.equals("newly_disconnected") ? "disconnected" : "connected";
            return getPostOfficesByDateRange(range[0], range[1], type, status);
        }

        List<Map<String, Object>> offices = postalOfficeRepository
            .findAllNonArchivedWithConnectivity()
            .stream().map(this::convertToMapDTO).collect(Collectors.toList());

        if (areaInt != null) {
            final Integer ai = areaInt;
            offices = offices.stream()
                .filter(o -> ai.equals(o.get("areaId")))
                .collect(Collectors.toList());
        }

        if (status != null && !status.trim().isEmpty()) {
            String sf = status.trim();
            offices = offices.stream()
                .filter(o -> {
                    Boolean s = (Boolean) o.get("status");
                    if ("active".equals(sf))   return Boolean.TRUE.equals(s);
                    if ("inactive".equals(sf)) return !Boolean.TRUE.equals(s);
                    return true;
                })
                .collect(Collectors.toList());
        }

        return offices;
    }

    private List<Map<String, Object>> getPostOfficesByDateRange(
            LocalDateTime startDate, LocalDateTime endDate,
            String connectionType, String status) {

        List<com.pps.profilesystem.Entity.PostalOffice> offices;
        if ("connected".equals(connectionType)) {
            offices = postalOfficeRepository.findByDateConnectedBetween(startDate, endDate);
        } else {
            offices = postalOfficeRepository.findByDateDisconnectedBetween(startDate, endDate);
        }
        return offices.stream().map(this::convertToMapDTO).collect(Collectors.toList());
    }

    // ── DTO converter ─────────────────────────────────────────────────────────

    private Map<String, Object> convertToMapDTO(com.pps.profilesystem.Entity.PostalOffice office) {
        Map<String, Object> dto = new java.util.HashMap<>();
        dto.put("id",                          office.getId());
        dto.put("name",                        office.getName());
        dto.put("address",                     office.getAddress());
        dto.put("zipCode",                     office.getZipCode());
        dto.put("postmaster",                  office.getPostmaster());
        dto.put("noOfEmployees",               office.getNoOfEmployees());
        dto.put("postalOfficeContactPerson",   office.getPostalOfficeContactPerson());
        dto.put("postalOfficeContactNumber",   office.getPostalOfficeContactNumber());
        dto.put("latitude",                    office.getLatitude());
        dto.put("longitude",                   office.getLongitude());
        dto.put("connectionStatus",            office.getConnectionStatus());
        dto.put("status",                      office.getConnectionStatus());
        dto.put("speed",                       office.getSpeed());

        // area is eagerly fetched via JOIN FETCH — safe to access
        dto.put("area",   office.getArea() != null ? office.getArea().getAreaName() : null);
        dto.put("areaId", office.getArea() != null ? office.getArea().getId()       : null);

        // lazy fields — skip to avoid LazyInitializationException on map endpoint
        dto.put("region",           null);
        dto.put("province",         null);
        dto.put("cityMunicipality", null);
        dto.put("barangay",         null);

        dto.put("profilePhotoUrl",
            office.getProfilePicture() != null && !office.getProfilePicture().isBlank()
                ? "/api/postal-office/" + office.getId() + "/profile-photo" : null);

        dto.put("coverPhotoUrl",
            office.getCoverPhoto() != null && !office.getCoverPhoto().isBlank()
                ? "/api/postal-office/" + office.getId() + "/cover-photo" : null);

        return dto;
    }

    private Map<String, Object> convertToProfileDTO(com.pps.profilesystem.Entity.PostalOffice office) {
        Map<String, Object> dto = new java.util.HashMap<>();
        dto.put("id",                          office.getId());
        dto.put("name",                        office.getName());
        dto.put("address",                     office.getAddress());
        dto.put("zipCode",                     office.getZipCode());
        dto.put("postmaster",                  office.getPostmaster());
        dto.put("noOfEmployees",               office.getNoOfEmployees());
        dto.put("postalOfficeContactPerson",   office.getPostalOfficeContactPerson());
        dto.put("postalOfficeContactNumber",   office.getPostalOfficeContactNumber());
        dto.put("latitude",                    office.getLatitude());
        dto.put("longitude",                   office.getLongitude());
        dto.put("connectionStatus",            office.getConnectionStatus());
        dto.put("status",                      office.getConnectionStatus());
        dto.put("speed",                       office.getSpeed());
        dto.put("officeStatus",                office.getOfficeStatus());
        dto.put("remarks",                     office.getRemarks());

        // area is eagerly fetched via JOIN FETCH — safe to access
        dto.put("area",   office.getArea() != null ? office.getArea().getAreaName() : null);
        dto.put("areaId", office.getArea() != null ? office.getArea().getId()       : null);

        // For profile modal, we can include more details since it's a single record
        dto.put("region",           office.getRegion());
        dto.put("province",         office.getProvince());
        dto.put("cityMunicipality", office.getCityMunicipality());
        dto.put("barangay",         office.getBarangay());

        dto.put("profilePhotoUrl",
            office.getProfilePicture() != null && !office.getProfilePicture().isBlank()
                ? "/api/postal-office/" + office.getId() + "/profile-photo" : null);

        dto.put("coverPhotoUrl",
            office.getCoverPhoto() != null && !office.getCoverPhoto().isBlank()
                ? "/api/postal-office/" + office.getId() + "/cover-photo" : null);

        return dto;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Integer parseInteger(String val) {
        if (val == null || val.trim().isEmpty()) return null;
        try { return Integer.parseInt(val.trim()); } catch (NumberFormatException e) { return null; }
    }

    private Integer parseQuarter(String val) {
        if (val == null || val.trim().isEmpty()) return null;
        String q = val.trim().toUpperCase();
        if (!q.startsWith("Q")) return null;
        try {
            int n = Integer.parseInt(q.substring(1));
            return (n >= 1 && n <= 4) ? n : null;
        } catch (NumberFormatException e) { return null; }
    }

    private LocalDateTime[] getQuarterDateRange(int year, int quarter) {
        Month startMonth, endMonth;
        switch (quarter) {
            case 1: startMonth = Month.JANUARY;  endMonth = Month.MARCH;     break;
            case 2: startMonth = Month.APRIL;    endMonth = Month.JUNE;      break;
            case 3: startMonth = Month.JULY;     endMonth = Month.SEPTEMBER; break;
            case 4: startMonth = Month.OCTOBER;  endMonth = Month.DECEMBER;  break;
            default: throw new IllegalArgumentException("Quarter must be 1-4");
        }
        LocalDateTime start = LocalDateTime.of(year, startMonth, 1, 0, 0, 0);
        LocalDateTime end   = LocalDateTime.of(year, endMonth,
            endMonth.length(isLeapYear(year)), 23, 59, 59);
        return new LocalDateTime[]{start, end};
    }

    private boolean isLeapYear(int year) {
        return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    }
}