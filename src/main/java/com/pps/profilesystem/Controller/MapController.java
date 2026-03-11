package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Repository.PostalOfficeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.Month;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST Controller for map-related postal office data
 * Returns postal offices with coordinates for map visualization
 */
@RestController
@RequestMapping("/api")
public class MapController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @GetMapping("/post-offices")
    public List<Map<String, Object>> getPostOffices() {
        return postalOfficeRepository.findAllWithAreaForMapNonArchived()
            .stream()
            .map(this::convertToMapDTO)
            .collect(Collectors.toList());
    }

    @GetMapping("/post-offices/all")
    public List<Map<String, Object>> getAllPostOffices(
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String quarter,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String status) {

        if (year == null && quarter == null && area == null && status == null) {
            return postalOfficeRepository.findAllNonArchivedWithConnectivity()
                .stream()
                .map(this::convertToMapDTO)
                .collect(Collectors.toList());
        }

        Integer yearInt = null;
        Integer quarterInt = null;

        if (year != null && !year.trim().isEmpty()) {
            try {
                yearInt = Integer.parseInt(year.trim());
            } catch (NumberFormatException e) {
                return postalOfficeRepository.findAllNonArchivedWithConnectivity()
                    .stream()
                    .map(this::convertToMapDTO)
                    .collect(Collectors.toList());
            }
        }

        if (quarter != null && !quarter.trim().isEmpty()) {
            String quarterStr = quarter.trim().toUpperCase();
            if (quarterStr.startsWith("Q")) {
                try {
                    quarterInt = Integer.parseInt(quarterStr.substring(1));
                    if (quarterInt < 1 || quarterInt > 4) quarterInt = null;
                } catch (NumberFormatException e) {
                    quarterInt = null;
                }
            }
        }

        Integer areaTemp = null;
        if (area != null && !area.trim().isEmpty()) {
            try { areaTemp = Integer.parseInt(area.trim()); }
            catch (NumberFormatException e) { areaTemp = null; }
        }
        final Integer areaInt = areaTemp;

        if (yearInt != null && quarterInt != null) {
            LocalDateTime[] quarterDates = getQuarterDateRange(yearInt, quarterInt);
            return getPostOfficesByDateRange(
                quarterDates[0], quarterDates[1],
                status != null && status.equals("newly_disconnected") ? "disconnected" : "connected",
                status);
        }

        if (yearInt != null && (status != null && (status.equals("newly_connected") || status.equals("newly_disconnected")))) {
            LocalDateTime now = LocalDateTime.now();
            int currentQuarter = (now.getMonthValue() - 1) / 3 + 1;
            LocalDateTime[] quarterDates = getQuarterDateRange(yearInt, currentQuarter);
            return getPostOfficesByDateRange(
                quarterDates[0], quarterDates[1],
                status.equals("newly_disconnected") ? "disconnected" : "connected",
                status);
        }

        List<Map<String, Object>> offices = postalOfficeRepository.findAllNonArchivedWithConnectivity()
            .stream()
            .map(this::convertToMapDTO)
            .collect(Collectors.toList());

        if (areaInt != null) {
            offices = offices.stream()
                .filter(office -> {
                    Object areaId = office.get("areaId");
                    return areaId != null && areaId.equals(areaInt);
                })
                .collect(Collectors.toList());
        }

        if (status != null && !status.trim().isEmpty()) {
            String statusFilter = status.trim();
            offices = offices.stream()
                .filter(office -> {
                    Boolean officeStatus = (Boolean) office.get("status");
                    if ("active".equals(statusFilter)) return Boolean.TRUE.equals(officeStatus);
                    else if ("inactive".equals(statusFilter)) return !Boolean.TRUE.equals(officeStatus);
                    return true;
                })
                .collect(Collectors.toList());
        }

        return offices;
    }

    private List<Map<String, Object>> getPostOfficesByDateRange(
            LocalDateTime startDate, LocalDateTime endDate, String connectionType, String status) {

        List<com.pps.profilesystem.Entity.PostalOffice> offices;
        if ("connected".equals(connectionType)) {
            offices = postalOfficeRepository.findByDateConnectedBetween(startDate, endDate);
        } else {
            offices = postalOfficeRepository.findByDateDisconnectedBetween(startDate, endDate);
        }
        return offices.stream().map(this::convertToMapDTO).collect(Collectors.toList());
    }

    private Map<String, Object> convertToMapDTO(com.pps.profilesystem.Entity.PostalOffice office) {
        Map<String, Object> dto = new java.util.HashMap<>();
        dto.put("id", office.getId());
        dto.put("name", office.getName());
        dto.put("address", office.getAddress());
        dto.put("zipCode", office.getZipCode());
        dto.put("postmaster", office.getPostmaster());
        dto.put("noOfEmployees", office.getNoOfEmployees());
        dto.put("postalOfficeContactPerson", office.getPostalOfficeContactPerson());
        dto.put("postalOfficeContactNumber", office.getPostalOfficeContactNumber());
        dto.put("latitude", office.getLatitude());
        dto.put("longitude", office.getLongitude());
        dto.put("connectionStatus", office.getConnectionStatus());
        dto.put("speed", office.getSpeed());
        dto.put("area", office.getArea() != null ? office.getArea().getAreaName() : null);
        dto.put("areaId", office.getArea() != null ? office.getArea().getId() : null);
        dto.put("region", office.getRegion() != null ? office.getRegion().getName() : null);
        dto.put("province", office.getProvince() != null ? office.getProvince().getName() : null);
        dto.put("cityMunicipality", office.getCityMunicipality() != null ? office.getCityMunicipality().getName() : null);
        dto.put("barangay", office.getBarangay() != null ? office.getBarangay().getName() : null);
        dto.put("status", office.getConnectionStatus());

        // ✅ Send URL strings — JS uses these as <img src>
        // profilePicture and coverPhoto are varchar file paths in DB
        dto.put("profilePhotoUrl",
            office.getProfilePicture() != null && !office.getProfilePicture().isBlank()
                ? "/api/postal-office/" + office.getId() + "/profile-photo"
                : null);

        dto.put("coverPhotoUrl",
            office.getCoverPhoto() != null && !office.getCoverPhoto().isBlank()
                ? "/api/postal-office/" + office.getId() + "/cover-photo"
                : null);

        return dto;
    }

    private LocalDateTime[] getQuarterDateRange(int year, int quarter) {
        Month startMonth, endMonth;
        switch (quarter) {
            case 1: startMonth = Month.JANUARY;   endMonth = Month.MARCH;     break;
            case 2: startMonth = Month.APRIL;     endMonth = Month.JUNE;      break;
            case 3: startMonth = Month.JULY;      endMonth = Month.SEPTEMBER; break;
            case 4: startMonth = Month.OCTOBER;   endMonth = Month.DECEMBER;  break;
            default: throw new IllegalArgumentException("Quarter must be 1-4");
        }
        LocalDateTime start = LocalDateTime.of(year, startMonth, 1, 0, 0, 0);
        LocalDateTime end   = LocalDateTime.of(year, endMonth, endMonth.length(isLeapYear(year)), 23, 59, 59);
        return new LocalDateTime[]{start, end};
    }

    private boolean isLeapYear(int year) {
        return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    }
}