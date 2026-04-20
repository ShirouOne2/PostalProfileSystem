package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.Connectivity;
import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.ArchivedOfficeRepository;
import com.pps.profilesystem.Repository.ConnectivityRepository;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.time.Month;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/quarters")
public class QuartersApiController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private ConnectivityRepository connectivityRepository;

    @Autowired
    private ArchivedOfficeRepository archivedOfficeRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Main endpoint for the Quarters page table.
     * Filters offices by year, quarter, area, and status.
     */
    @GetMapping("/post-offices")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getQuartersPostOffices(
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String quarter,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String status) {

        try {
            // Get the logged-in user and apply area restrictions
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email = auth.getName();
            User currentUser = userRepository.findByEmail(email).orElse(null);

            Integer roleId = currentUser != null ? currentUser.getRole() : null;
            Integer userAreaId = currentUser != null ? currentUser.getAreaId() : null;

            // Parse params
            Integer yearInt = parseInteger(year);
            Integer quarterInt = parseQuarter(quarter);
            Integer areaInt = parseInteger(area);

            // Apply user area restrictions: non-system-admin users can only see their assigned area
            if (roleId != null && roleId != 1 && roleId != 4) {
                // User is not a system admin, restrict to their assigned area
                if (userAreaId != null) {
                    // If no area filter is set, default to user's area
                    if (areaInt == null) {
                        areaInt = userAreaId;
                    } else if (!areaInt.equals(userAreaId)) {
                        // User is trying to access an area they're not assigned to - redirect to their area
                        areaInt = userAreaId;
                    }
                } else {
                    // User has no area assigned, return empty list
                    return new ArrayList<>();
                }
            }
            // If roleId is null or roleId == 1 (system admin), allow all areas

            // Resolve year/quarter — default to current if not provided
            int resolvedYear = (yearInt != null) ? yearInt : LocalDateTime.now().getYear();
            int resolvedQuarter = (quarterInt != null) ? quarterInt
                    : (LocalDateTime.now().getMonthValue() - 1) / 3 + 1;

            LocalDateTime[] range = getQuarterDateRange(resolvedYear, resolvedQuarter);
            LocalDateTime qStart = range[0];
            LocalDateTime qEnd = range[1];

            List<Map<String, Object>> offices;

            if ("newly_connected".equals(status)) {
                // Only show offices that ACTUALLY connected within this quarter
                List<Connectivity> records = connectivityRepository.findByDateConnectedBetween(qStart, qEnd);
                offices = toUniqueDTOsWithFlag(records, true, true);
            } else if ("newly_disconnected".equals(status)) {
                // Offices that DISCONNECTED within quarter
                List<Connectivity> records = connectivityRepository.findByDateDisconnectedBetween(qStart, qEnd);
                offices = toUniqueDTOsWithFlag(records, false, false);
            } else {
                // Show ALL non-archived offices (active + inactive)
                // Use connectionStatus from PostalOffice as source of truth

                Set<Integer> newlyConnectedIds = connectivityRepository.findByDateConnectedBetween(qStart, qEnd)
                        .stream()
                        .filter(c -> c.getPostalOffice() != null && !archivedOfficeRepository.existsByPostalOfficeId(c.getPostalOffice().getId()))
                        .map(c -> c.getPostalOffice().getId())
                        .collect(Collectors.toSet());

                offices = postalOfficeRepository.findAllNonArchivedWithConnectivity()
                        .stream()
                        .map(po -> {
                            Map<String, Object> dto = convertToDTO(po);
                            dto.put("newThisQuarter", newlyConnectedIds.contains(po.getId()));
                            return dto;
                        })
                        .collect(Collectors.toList());
            }

            // Apply area filter
            if (areaInt != null) {
                final Integer ai = areaInt;
                offices = offices.stream()
                        .filter(o -> ai.equals(o.get("areaId")))
                        .collect(Collectors.toList());
            }

            // Apply active / inactive status filter
            if ("active".equals(status)) {
                offices = offices.stream()
                        .filter(o -> Boolean.TRUE.equals(o.get("status")))
                        .collect(Collectors.toList());
            } else if ("inactive".equals(status)) {
                offices = offices.stream()
                        .filter(o -> !Boolean.TRUE.equals(o.get("status")))
                        .collect(Collectors.toList());
            }

            return offices;

        } catch (Exception e) {
            // Log the error and return empty list with error info
            System.err.println("Error in getQuartersPostOffices: " + e.getMessage());
            e.printStackTrace();

            // Return empty list with error info for debugging
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", true);
            errorResponse.put("message", "Failed to load post offices: " + e.getMessage());
            errorResponse.put("timestamp", LocalDateTime.now().toString());

            return List.of(errorResponse);
        }
    }

    @GetMapping("/export")
    public ResponseEntity<String> exportReport(
            @RequestParam String type,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String areaFilter,
            @RequestParam(required = false) String quarterFilter,
            @RequestParam(required = false) String statusFilter) {
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .body("Export feature coming soon for type: " + type);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Like toUniqueDTOs but overrides the status field and marks newThisQuarter.
     * @param statusOverride  the boolean status to set in the DTO (true=active, false=inactive)
     * @param newThisQuarter  whether to mark offices with the "New This Quarter" badge
     */
    private List<Map<String, Object>> toUniqueDTOsWithFlag(
            List<Connectivity> records, boolean statusOverride, boolean newThisQuarter) {
        Map<Integer, PostalOffice> seen = new LinkedHashMap<>();
        for (Connectivity c : records) {
            PostalOffice po = c.getPostalOffice();
            if (po == null || archivedOfficeRepository.existsByPostalOfficeId(po.getId())) continue;
            seen.putIfAbsent(po.getId(), po);
        }
        return seen.values().stream().map(po -> {
            Map<String, Object> dto = convertToDTO(po);
            dto.put("status", statusOverride);         // override with correct status
            dto.put("newThisQuarter", newThisQuarter); // flag for badge
            return dto;
        }).collect(Collectors.toList());
    }

    private Map<String, Object> convertToDTO(PostalOffice po) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id",       po.getId());
        dto.put("name",     po.getName());
        dto.put("address",  po.getAddress());
        dto.put("zipCode",  po.getZipCode());
        dto.put("postmaster", po.getPostmaster());
        dto.put("speed",    po.getSpeed());
        dto.put("status",   po.getConnectionStatus());
        dto.put("officeStatus", po.getOfficeStatus());
        dto.put("areaId",   po.getArea() != null ? po.getArea().getId() : null);
        dto.put("area",     po.getArea() != null ? po.getArea().getAreaName() : null);
        dto.put("regionId", po.getRegion() != null ? po.getRegion().getId() : null);
        dto.put("region",   po.getRegion() != null ? po.getRegion().getName() : null);
        dto.put("province", po.getProvince() != null ? po.getProvince().getName() : null);
        dto.put("cityMunicipality", po.getCityMunicipality() != null ? po.getCityMunicipality().getName() : null);
        dto.put("noOfEmployees",    po.getNoOfEmployees());
        dto.put("noOfPostalTellers",  po.getNoOfPostalTellers());
        dto.put("noOfLetterCarriers", po.getNoOfLetterCarriers());
        dto.put("postalOfficeContactPerson", po.getPostalOfficeContactPerson());
        dto.put("postalOfficeContactNumber", po.getPostalOfficeContactNumber());
        dto.put("internetServiceProvider",   po.getInternetServiceProvider());
        dto.put("typeOfConnection",  po.getTypeOfConnection());
        dto.put("staticIpAddress",   po.getStaticIpAddress());
        dto.put("ispContactPerson",  po.getIspContactPerson());
        dto.put("ispContactNumber",  po.getIspContactNumber());
        dto.put("latitude",  po.getLatitude());
        dto.put("longitude", po.getLongitude());
        dto.put("remarks",   po.getRemarks());
        return dto;
    }

    private Integer parseInteger(String val) {
        if (val == null || val.trim().isEmpty()) return null;
        try { return Integer.parseInt(val.trim()); } catch (NumberFormatException e) { return null; }
    }

    private Integer parseQuarter(String val) {
        if (val == null || val.trim().isEmpty()) return null;
        String q = val.trim().toUpperCase();
        if (q.startsWith("Q")) {
            try {
                int n = Integer.parseInt(q.substring(1));
                return (n >= 1 && n <= 4) ? n : null;
            } catch (NumberFormatException e) { return null; }
        }
        return null;
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
        boolean leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        return new LocalDateTime[]{
            LocalDateTime.of(year, startMonth, 1, 0, 0, 0),
            LocalDateTime.of(year, endMonth, endMonth.length(leap), 23, 59, 59)
        };
    }
}