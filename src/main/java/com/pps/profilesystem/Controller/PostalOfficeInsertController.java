package com.pps.profilesystem.Controller;

import com.pps.profilesystem.DTO.BarangayDTO;
import com.pps.profilesystem.DTO.CityMunicipalityDTO;
import com.pps.profilesystem.DTO.ProvinceDTO;
import com.pps.profilesystem.Entity.*;
import com.pps.profilesystem.DTO.ConnectivityNotification;
import com.pps.profilesystem.Service.ConnectivityNotificationService;
import com.pps.profilesystem.Service.LocationHierarchyService;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Repository.ConnectivityRepository;
import com.pps.profilesystem.Repository.ProviderRepository;
import com.pps.profilesystem.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/postal")
public class PostalOfficeInsertController {

    @Autowired private PostalOfficeRepository postalOfficeRepository;
    @Autowired private LocationHierarchyService locationService;
    @Autowired private ConnectivityNotificationService notifService;
    @Autowired private ConnectivityRepository connectivityRepository;
    @Autowired private ProviderRepository providerRepository;
    @Autowired private UserRepository userRepository;

    // ── Location lookup endpoints ─────────────────────────────────────────────

    @GetMapping("/areas")
    public ResponseEntity<?> getAllAreas(Authentication auth) {
        try {
            List<Area> visibleAreas = getVisibleAreasForUser(auth);
            List<Map<String, Object>> result = visibleAreas.stream()
                .map(a -> { Map<String, Object> m = new HashMap<>(); m.put("id", a.getId()); m.put("name", a.getAreaName()); return m; })
                .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) { return err("Failed to load areas: " + e.getMessage()); }
    }

    /**
     * Compatibility endpoint for UIs that must always show the complete area list.
     * (Some pages may have role-based filtering elsewhere; this endpoint is explicit.)
     */
    @GetMapping("/areas/all")
    public ResponseEntity<?> getAllAreasUnfiltered(Authentication auth) {
        // Legacy endpoint; now aligned with role visibility policy.
        return getAllAreas(auth);
    }

    @GetMapping("/regions")
    public ResponseEntity<?> getAllRegions() {
        try {
            List<Map<String, Object>> result = locationService.getAllRegions().stream()
                .map(r -> { Map<String, Object> m = new HashMap<>(); m.put("id", r.getId()); m.put("name", r.getName()); return m; })
                .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) { return err("Failed to load regions: " + e.getMessage()); }
    }

    @GetMapping("/provinces/by-region/{regionId}")
    public ResponseEntity<?> getProvincesByRegion(@PathVariable Integer regionId) {
        try {
            List<ProvinceDTO> dtos = locationService.getProvincesByRegion(regionId).stream()
                .map(p -> new ProvinceDTO(p.getId(), p.getName())).collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) { return err("Failed to load provinces: " + e.getMessage()); }
    }

    @GetMapping("/provinces/by-area/{areaId}")
    public ResponseEntity<?> getProvincesByArea(@PathVariable Integer areaId) {
        try {
            List<ProvinceDTO> dtos = locationService.getProvincesByArea(areaId).stream()
                    .map(p -> new ProvinceDTO(p.getId(), p.getName()))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) { return err("Failed to load provinces: " + e.getMessage()); }
    }

    @GetMapping("/cities/by-province/{provinceId}")
    public ResponseEntity<?> getCitiesByProvince(@PathVariable Integer provinceId) {
        try {
            List<CityMunicipalityDTO> dtos = locationService.getCitiesByProvince(provinceId).stream()
                .map(c -> new CityMunicipalityDTO(c.getId(), c.getName())).collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) { return err("Failed to load cities: " + e.getMessage()); }
    }

    @GetMapping("/barangays/by-city/{cityId}")
    public ResponseEntity<?> getBarangaysByCity(@PathVariable Integer cityId) {
        try {
            List<BarangayDTO> dtos = locationService.getBarangaysByCity(cityId).stream()
                .map(b -> new BarangayDTO(b.getId(), b.getName())).collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) { return err("Failed to load barangays: " + e.getMessage()); }
    }

    // ── INSERT ────────────────────────────────────────────────────────────────

    @PostMapping("/postal-office/insert")
    @Transactional
    public ResponseEntity<Map<String, Object>> insertPostalOffice(
            @RequestBody Map<String, Object> requestData, Authentication auth) {
        try {
            PostalOffice office = buildPostalOfficeFromRequest(requestData);
            PostalOffice saved  = postalOfficeRepository.save(office);

            // Save connectivity record with plan/billing details
            saveConnectivityRecord(saved, requestData);

            String actor  = actor(auth);
            Integer actorRoleId = ConnectivityNotificationService.roleIdFromAuthorities(
                    auth != null ? auth.getAuthorities() : null
            );
            boolean hasConn = Boolean.TRUE.equals(saved.getConnectionStatus());

            notifService.pushAudit(
                    hasConn ? ConnectivityNotification.Type.CONNECTED : ConnectivityNotification.Type.NEW,
                    saved.getName(),
                    saved.getId(),
                    actor,
                    actorRoleId,
                    buildInsertDetail(saved, requestData),
                    null,
                    "CONNECTIVITY",
                    "PostalOffice",
                    saved.getId() != null ? saved.getId().longValue() : null
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Postal office added successfully");
            response.put("id",      saved.getId());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to add postal office: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    // ── Connectivity record with plan/billing ─────────────────────────────────

    private void saveConnectivityRecord(PostalOffice savedOffice, Map<String, Object> req) {
        String planName    = strVal(req.get("planName"));
        String accountNum  = strVal(req.get("accountNumber"));
        Object planPriceRaw = req.get("planPrice");
        String ownedShared = strVal(req.get("ownedOrShared"));

        boolean hasConnData = Boolean.TRUE.equals(savedOffice.getConnectionStatus())
                || planName != null || accountNum != null || planPriceRaw != null;
        if (!hasConnData) return;

        Provider provider = providerRepository.findAll().stream().findFirst().orElseGet(() -> {
            Provider p = new Provider(); p.setName("Default Provider"); return providerRepository.save(p);
        });

        Connectivity conn = new Connectivity();
        conn.setPostalOffice(savedOffice);
        conn.setProvider(provider);
        if (planName   != null) conn.setPlanName(planName);
        if (accountNum != null) conn.setAccountNumber(accountNum);
        if (planPriceRaw != null) {
            try { conn.setPlanPrice(new BigDecimal(planPriceRaw.toString())); } catch (Exception ignored) {}
        }
        if (ownedShared != null) conn.setIsShared("Shared".equalsIgnoreCase(ownedShared));

        Connectivity savedConn = connectivityRepository.save(conn);

        if (Boolean.TRUE.equals(savedOffice.getConnectionStatus())) {
            savedOffice.setActiveConnectivity(savedConn);
            postalOfficeRepository.save(savedOffice);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String buildInsertDetail(PostalOffice saved, Map<String, Object> req) {
        StringBuilder sb = new StringBuilder("New office added");
        String isp = saved.getInternetServiceProvider();
        if (isp   != null && !isp.isBlank())   sb.append(" · ISP: ").append(isp);
        String spd = saved.getSpeed();
        if (spd   != null && !spd.isBlank())   sb.append(" · ").append(spd);
        String typ = saved.getTypeOfConnection();
        if (typ   != null && !typ.isBlank())   sb.append(" · ").append(typ);
        String pln = strVal(req.get("planName"));
        if (pln   != null)                     sb.append(" · Plan: ").append(pln);
        if (!Boolean.TRUE.equals(saved.getConnectionStatus())) sb.append(" · Status: Inactive");
        return sb.toString();
    }

    private String actor(Authentication auth) {
        return (auth != null && auth.getName() != null) ? auth.getName() : "unknown";
    }

    private List<Area> getVisibleAreasForUser(Authentication auth) {
        List<Area> allAreas = locationService.getAllAreas();
        if (auth == null || auth.getName() == null) return allAreas;

        User currentUser = userRepository.findByEmail(auth.getName()).orElse(null);
        if (currentUser == null) return allAreas;

        Integer roleId = currentUser.getRole();
        Integer areaId = currentUser.getAreaId();

        // Admin (1) and SRD Operation (4) can access all areas.
        if (roleId != null && (roleId == 1 || roleId == 4)) return allAreas;

        // Area Admin (2) and User (3) only see their assigned area.
        if (areaId == null) return List.of();
        return allAreas.stream()
                .filter(a -> areaId.equals(a.getId()))
                .collect(Collectors.toList());
    }

    private ResponseEntity<Map<String, Object>> err(String msg) {
        Map<String, Object> e = new HashMap<>();
        e.put("success", false); e.put("message", msg);
        return ResponseEntity.status(500).body(e);
    }

    private Integer parseInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Integer) return (Integer) value;
        if (value instanceof String) { try { return Integer.parseInt((String) value); } catch (NumberFormatException e) { return null; } }
        if (value instanceof Number)  return ((Number) value).intValue();
        return null;
    }

    private String strVal(Object v) {
        if (v == null) return null;
        String s = v.toString().trim();
        return s.isEmpty() ? null : s;
    }

    private PostalOffice buildPostalOfficeFromRequest(Map<String, Object> requestData) {
        PostalOffice office = new PostalOffice();

        // Basic Info
        if (requestData.get("name")                   != null) office.setName(requestData.get("name").toString());
        if (requestData.get("postmaster")             != null) office.setPostmaster(requestData.get("postmaster").toString());
        if (requestData.get("address")                != null) office.setAddress(requestData.get("address").toString());
        if (requestData.get("zipCode")                != null) office.setZipCode(requestData.get("zipCode").toString());

        // Classification & Services
        if (requestData.get("classification")         != null) office.setClassification(requestData.get("classification").toString());
        if (requestData.get("serviceProvided")        != null) office.setServiceProvided(requestData.get("serviceProvided").toString());
        if (requestData.get("remarks")                != null) office.setRemarks(requestData.get("remarks").toString());

        // Office Status (OPEN / CLOSED)
        if (requestData.get("officeStatus")           != null) office.setOfficeStatus(requestData.get("officeStatus").toString());

        // Connectivity / ISP
        if (requestData.get("internetServiceProvider") != null) office.setInternetServiceProvider(requestData.get("internetServiceProvider").toString());
        if (requestData.get("typeOfConnection")       != null) office.setTypeOfConnection(requestData.get("typeOfConnection").toString());
        if (requestData.get("speed")                  != null) office.setSpeed(requestData.get("speed").toString());
        if (requestData.get("staticIpAddress")        != null) office.setStaticIpAddress(requestData.get("staticIpAddress").toString());

        // ISP Contact
        if (requestData.get("ispContactPerson")       != null) office.setIspContactPerson(requestData.get("ispContactPerson").toString());
        if (requestData.get("ispContactNumber")       != null) office.setIspContactNumber(requestData.get("ispContactNumber").toString());

        // Postal Office Contact (Step 4)
        if (requestData.get("postalOfficeContactPerson") != null) office.setPostalOfficeContactPerson(requestData.get("postalOfficeContactPerson").toString());
        if (requestData.get("postalOfficeContactNumber") != null) office.setPostalOfficeContactNumber(requestData.get("postalOfficeContactNumber").toString());

        // Postmaster Contact Number — stored as postal office contact number if no dedicated column
        // (postalOfficeContactNumber from Step 4 takes priority if also filled)
        if (requestData.get("postmasterContactNumber") != null && office.getPostalOfficeContactNumber() == null)
            office.setPostalOfficeContactNumber(requestData.get("postmasterContactNumber").toString());

        // Staff
        if (requestData.get("noOfEmployees")          != null) office.setNoOfEmployees(parseInteger(requestData.get("noOfEmployees")));
        if (requestData.get("noOfPostalTellers")      != null) office.setNoOfPostalTellers(parseInteger(requestData.get("noOfPostalTellers")));
        if (requestData.get("noOfLetterCarriers")     != null) office.setNoOfLetterCarriers(parseInteger(requestData.get("noOfLetterCarriers")));

        // Location Hierarchy
        if (requestData.get("areaId") != null) {
            Integer areaId = parseInteger(requestData.get("areaId"));
            if (areaId != null) locationService.getAllAreas().stream().filter(a -> a.getId().equals(areaId)).findFirst().ifPresent(office::setArea);
        }
        if (requestData.get("provinceId") != null) {
            Integer provinceId = parseInteger(requestData.get("provinceId"));
            Integer areaId     = parseInteger(requestData.get("areaId"));
            if (provinceId != null && areaId != null)
                locationService.getProvincesByArea(areaId).stream().filter(p -> p.getId().equals(provinceId)).findFirst().ifPresent(office::setProvince);
        }
        if (requestData.get("cityMunId") != null) {
            Integer cityMunId  = parseInteger(requestData.get("cityMunId"));
            Integer provinceId = parseInteger(requestData.get("provinceId"));
            if (cityMunId != null && provinceId != null)
                locationService.getCitiesByProvince(provinceId).stream().filter(c -> c.getId().equals(cityMunId)).findFirst().ifPresent(office::setCityMunicipality);
        }
        if (requestData.get("barangayId") != null) {
            Integer barangayId = parseInteger(requestData.get("barangayId"));
            Integer cityMunId  = parseInteger(requestData.get("cityMunId"));
            if (barangayId != null && cityMunId != null)
                locationService.getBarangaysByCity(cityMunId).stream().filter(b -> b.getId().equals(barangayId)).findFirst().ifPresent(office::setBarangay);
        }

        // Coordinates
        if (requestData.get("latitude") != null) {
            Object v = requestData.get("latitude");
            try { if (v instanceof Number) office.setLatitude(((Number) v).doubleValue()); else if (v instanceof String && !((String)v).isEmpty()) office.setLatitude(Double.parseDouble((String) v)); } catch (NumberFormatException ignored) {}
        }
        if (requestData.get("longitude") != null) {
            Object v = requestData.get("longitude");
            try { if (v instanceof Number) office.setLongitude(((Number) v).doubleValue()); else if (v instanceof String && !((String)v).isEmpty()) office.setLongitude(Double.parseDouble((String) v)); } catch (NumberFormatException ignored) {}
        }

        // Connection Status
        Object statusVal = requestData.get("connectionStatus");
        if (statusVal instanceof Boolean) office.setConnectionStatus((Boolean) statusVal);
        else if (statusVal instanceof String) office.setConnectionStatus(Boolean.parseBoolean((String) statusVal));
        else office.setConnectionStatus(false);

        return office;
    }
}