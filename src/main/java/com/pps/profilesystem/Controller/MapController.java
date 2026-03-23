package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Repository.PostalOfficeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.Month;
import java.util.Collections;
import java.util.List;
import java.util.Map;
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

    // ── /api/post-offices  (dashboard map) ───────────────────────────────────

    @GetMapping("/post-offices")
    public ResponseEntity<List<Map<String, Object>>> getPostOffices() {
        try {
            List<Map<String, Object>> result =
                postalOfficeRepository.findAllWithAreaForMapNonArchived()
                    .stream()
                    .map(this::convertToMapDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            // Log the real error so you can see it in the console
            System.err.println("[MapController] /api/post-offices ERROR: " + e.getMessage());
            e.printStackTrace();
            // Return empty list — JS map will just show no markers (no crash)
            return ResponseEntity.ok(Collections.emptyList());
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
        dto.put("speed",                       office.getSpeed());
        dto.put("area",    office.getArea()            != null ? office.getArea().getAreaName()         : null);
        dto.put("areaId",  office.getArea()            != null ? office.getArea().getId()               : null);
        dto.put("region",  office.getRegion()          != null ? office.getRegion().getName()           : null);
        dto.put("province",office.getProvince()        != null ? office.getProvince().getName()         : null);
        dto.put("cityMunicipality",
                           office.getCityMunicipality()!= null ? office.getCityMunicipality().getName(): null);
        dto.put("barangay",office.getBarangay()        != null ? office.getBarangay().getName()         : null);
        dto.put("status",  office.getConnectionStatus());

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