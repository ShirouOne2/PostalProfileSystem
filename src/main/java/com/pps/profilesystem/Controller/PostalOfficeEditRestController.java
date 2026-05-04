package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.*;
import com.pps.profilesystem.DTO.ConnectivityNotification;
import com.pps.profilesystem.Service.ConnectivityNotificationService;
import com.pps.profilesystem.Service.ApprovalService;
import com.pps.profilesystem.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST endpoints used by edit-modal.js
 *
 *  GET  /api/postal-office/{id}  ->  fetch office data for the modal
 *  PUT  /api/postal-office/{id}  ->  save changes from the modal
 */
@RestController
@RequestMapping("/api/postal-office")
public class PostalOfficeEditRestController {

    @Autowired private PostalOfficeRepository         postalOfficeRepository;
    @Autowired private ConnectivityNotificationService notifService;
    @Autowired private ApprovalService                approvalService;
    @Autowired private AreaRepository                 areaRepository;
    @Autowired private RegionsRepository              regionsRepository;
    @Autowired private ProvinceRepository             provinceRepository;
    @Autowired private CityMunicipalityRepository     cityMunicipalityRepository;
    @Autowired private BarangayRepository             barangayRepository;

    // -- GET --

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getOffice(@PathVariable Integer id) {
        try {
            return postalOfficeRepository.findById(id)
                .<ResponseEntity<?>>map(o -> {
                    Map<String, Object> d = new LinkedHashMap<>();

                    // Basic
                    d.put("id",                         o.getId());
                    d.put("name",                       o.getName());
                    d.put("postmaster",                 o.getPostmaster());
                    d.put("classification",             o.getClassification());
                    d.put("serviceProvided",            o.getServiceProvided());

                    // Address / coordinates
                    d.put("address",                    o.getAddress());
                    d.put("zipCode",                    o.getZipCode());
                    d.put("latitude",                   o.getLatitude());
                    d.put("longitude",                  o.getLongitude());

                    // Location hierarchy IDs -- JS uses these to pre-select dropdowns
                    // Area is EAGER -- safe to access directly
                    d.put("areaId", o.getArea() != null ? o.getArea().getId() : null);

                    // LAZY associations -- wrapped in try-catch to avoid LazyInitializationException
                    try { d.put("regionId",   o.getRegion()           != null ? o.getRegion().getId()           : null); }
                    catch (Exception e) { d.put("regionId",   null); }
                    try { d.put("provinceId", o.getProvince()         != null ? o.getProvince().getId()         : null); }
                    catch (Exception e) { d.put("provinceId", null); }
                    try { d.put("cityMunId",  o.getCityMunicipality() != null ? o.getCityMunicipality().getId() : null); }
                    catch (Exception e) { d.put("cityMunId",  null); }
                    try { d.put("barangayId", o.getBarangay()         != null ? o.getBarangay().getId()         : null); }
                    catch (Exception e) { d.put("barangayId", null); }

                    // Connectivity
                    d.put("connectionStatus",           o.getConnectionStatus());
                    d.put("officeStatus",               o.getOfficeStatus());
                    d.put("internetServiceProvider",    o.getInternetServiceProvider());
                    d.put("typeOfConnection",           o.getTypeOfConnection());
                    d.put("speed",                      o.getSpeed());
                    d.put("staticIpAddress",            o.getStaticIpAddress());

                    // Staff
                    d.put("noOfEmployees",              o.getNoOfEmployees());
                    d.put("noOfPostalTellers",          o.getNoOfPostalTellers());
                    d.put("noOfLetterCarriers",         o.getNoOfLetterCarriers());

                    // Contacts
                    d.put("postalOfficeContactPerson",  o.getPostalOfficeContactPerson());
                    d.put("postalOfficeContactNumber",  o.getPostalOfficeContactNumber());
                    d.put("ispContactPerson",           o.getIspContactPerson());
                    d.put("ispContactNumber",           o.getIspContactNumber());
                    d.put("remarks",                    o.getRemarks());

                    // Cover photo URL for popup
                    if (o.getCoverPhoto() != null && !o.getCoverPhoto().isBlank()) {
                        d.put("coverPhotoUrl", "/api/postal-office/" + id + "/cover-photo/1");
                    } else {
                        d.put("coverPhotoUrl", null);
                    }

                    return ResponseEntity.ok(d);
                })
                .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            System.err.println("[PostalOfficeEditRestController] GET /" + id + " ERROR: " + e.getMessage());
            e.printStackTrace();
            return error(500, "Failed to load office data: " + e.getMessage());
        }
    }

    // -- PUT --

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateOffice(@PathVariable Integer id,
                                          @RequestBody Map<String, Object> body,
                                          Authentication auth) {
        Optional<PostalOffice> opt = postalOfficeRepository.findById(id);
        if (opt.isEmpty()) return error(404, "Office not found with ID: " + id);

        try {
            PostalOffice o = opt.get();
            Snapshot before = Snapshot.of(o);
            String actor = actor(auth);

            boolean isSystemAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isAreaAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_AREA_ADMIN"));

            // Prepare changes for approval request if needed
            Map<String, Object> oldValues = createOldValuesMap(before);
            Map<String, Object> newValues = createNewValuesMap(body);

            if (isSystemAdmin) {
                // System admin can directly update
                applyChanges(o, body);
                postalOfficeRepository.save(o);

                // Diff + notify
                List<String> changes = diff(before, o);
                if (!changes.isEmpty()) {
                    ConnectivityNotification.Type type = resolveType(before, o);
                    Integer actorRoleId = ConnectivityNotificationService.roleIdFromAuthorities(
                            auth != null ? auth.getAuthorities() : null
                    );
                    notifService.pushAudit(
                            type,
                            o.getName(),
                            o.getId(),
                            actor,
                            actorRoleId,
                            String.join(" · ", changes),
                            null,
                            "CONNECTIVITY",
                            "PostalOffice",
                            o.getId() != null ? o.getId().longValue() : null
                    );
                }

                return ResponseEntity.ok(Map.of("success", true, "message", "Office updated successfully."));
            } else if (isAreaAdmin) {
                // Area Admin edits require SRD Operation final approval (skip Area Admin step)
                if (approvalService.hasPendingRequestForOffice(id)) {
                    return error(409, activeRequestBlockMessage(id));
                }

                Integer areaId = o.getArea() != null ? o.getArea().getId() : null;
                approvalService.createAreaApprovedRequest(
                        ApprovalRequest.RequestType.EDIT_OFFICE,
                        id,
                        o.getName(),
                        actor,
                        oldValues,
                        newValues,
                        areaId,
                        actor,
                        null
                );

                return ResponseEntity.ok(Map.of(
                        "success", true, 
                        "message", "Your changes have been forwarded to SRD Operation for final approval.",
                        "requiresApproval", true
                ));
            } else {
                // Regular user needs Area Admin approval first, then SRD Operation final approval
                if (approvalService.hasPendingRequestForOffice(id)) {
                    return error(409, activeRequestBlockMessage(id));
                }

                Integer areaId = o.getArea() != null ? o.getArea().getId() : null;
                approvalService.createApprovalRequest(
                        ApprovalRequest.RequestType.EDIT_OFFICE,
                        id,
                        o.getName(),
                        actor,
                        oldValues,
                        newValues,
                        areaId
                );

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Your changes have been submitted for approval.",
                        "requiresApproval", true
                ));
            }

        } catch (Exception e) {
            return error(500, "Update failed: " + e.getMessage());
        }
    }

    private Map<String, Object> createOldValuesMap(Snapshot before) {
        Map<String, Object> oldValues = new HashMap<>();
        oldValues.put("name", before.name);
        oldValues.put("postmaster", before.postmaster);
        oldValues.put("classification", before.classification);
        oldValues.put("serviceProvided", before.serviceProvided);
        oldValues.put("address", before.address);
        oldValues.put("zipCode", before.zipCode);
        oldValues.put("connectionStatus", before.connectionStatus);
        oldValues.put("officeStatus", before.officeStatus);
        oldValues.put("internetServiceProvider", before.isp);
        oldValues.put("typeOfConnection", before.connType);
        oldValues.put("speed", before.speed);
        oldValues.put("staticIpAddress", before.staticIp);
        oldValues.put("noOfEmployees", before.employees);
        oldValues.put("noOfPostalTellers", before.tellers);
        oldValues.put("noOfLetterCarriers", before.carriers);
        oldValues.put("postalOfficeContactPerson", before.contactPerson);
        oldValues.put("postalOfficeContactNumber", before.contactNumber);
        oldValues.put("ispContactPerson", before.ispContactPerson);
        oldValues.put("ispContactNumber", before.ispContactNumber);
        oldValues.put("remarks", before.remarks);
        return oldValues;
    }

    private Map<String, Object> createNewValuesMap(Map<String, Object> body) {
        Map<String, Object> newValues = new HashMap<>();
        copyIfPresent(body, newValues, "name");
        copyIfPresent(body, newValues, "postmaster");
        copyIfPresent(body, newValues, "classification");
        copyIfPresent(body, newValues, "serviceProvided");
        copyIfPresent(body, newValues, "address");
        copyIfPresent(body, newValues, "zipCode");
        copyIfPresent(body, newValues, "connectionStatus");
        copyIfPresent(body, newValues, "officeStatus");
        copyIfPresent(body, newValues, "internetServiceProvider");
        copyIfPresent(body, newValues, "typeOfConnection");
        copyIfPresent(body, newValues, "speed");
        copyIfPresent(body, newValues, "staticIpAddress");
        copyIfPresent(body, newValues, "noOfEmployees");
        copyIfPresent(body, newValues, "noOfPostalTellers");
        copyIfPresent(body, newValues, "noOfLetterCarriers");
        copyIfPresent(body, newValues, "postalOfficeContactPerson");
        copyIfPresent(body, newValues, "postalOfficeContactNumber");
        copyIfPresent(body, newValues, "ispContactPerson");
        copyIfPresent(body, newValues, "ispContactNumber");
        copyIfPresent(body, newValues, "remarks");
        copyIfPresent(body, newValues, "areaId");
        copyIfPresent(body, newValues, "regionId");
        copyIfPresent(body, newValues, "provinceId");
        copyIfPresent(body, newValues, "cityMunId");
        copyIfPresent(body, newValues, "barangayId");
        return newValues;
    }

    private void copyIfPresent(Map<String, Object> source, Map<String, Object> target, String key) {
        if (source.containsKey(key)) {
            target.put(key, source.get(key));
        }
    }

    private void applyChanges(PostalOffice o, Map<String, Object> body) {
        // Basic
        set(body, "name",           v -> o.setName(v.toString().trim()));
        set(body, "postmaster",     v -> o.setPostmaster(str(v)));
        set(body, "classification", v -> o.setClassification(str(v)));
        set(body, "serviceProvided",v -> o.setServiceProvided(str(v)));

        // Address / coordinates
        set(body, "address",    v -> o.setAddress(str(v)));
        set(body, "zipCode",    v -> o.setZipCode(str(v)));
        set(body, "latitude",   v -> { try { o.setLatitude(Double.parseDouble(v.toString()));  } catch (Exception ignored) {} });
        set(body, "longitude",  v -> { try { o.setLongitude(Double.parseDouble(v.toString())); } catch (Exception ignored) {} });

        // Location hierarchy
        set(body, "areaId",     v -> { Integer x = num(v); if (x != null) areaRepository.findById(x).ifPresent(o::setArea);                       else o.setArea(null); });
        set(body, "regionId",   v -> { Integer x = num(v); if (x != null) regionsRepository.findById(x).ifPresent(o::setRegion);                   else o.setRegion(null); });
        set(body, "provinceId", v -> { Integer x = num(v); if (x != null) provinceRepository.findById(x).ifPresent(o::setProvince);                else o.setProvince(null); });
        set(body, "cityMunId",  v -> { Integer x = num(v); if (x != null) cityMunicipalityRepository.findById(x).ifPresent(o::setCityMunicipality); else o.setCityMunicipality(null); });
        set(body, "barangayId", v -> { Integer x = num(v); if (x != null) barangayRepository.findById(x).ifPresent(o::setBarangay);                else o.setBarangay(null); });

        // Connectivity
        set(body, "connectionStatus",         v -> o.setConnectionStatus(bool(v)));
        set(body, "officeStatus",             v -> o.setOfficeStatus(str(v)));
        set(body, "internetServiceProvider",  v -> o.setInternetServiceProvider(str(v)));
        set(body, "typeOfConnection",         v -> o.setTypeOfConnection(str(v)));
        set(body, "speed",                    v -> o.setSpeed(str(v)));
        set(body, "staticIpAddress",          v -> o.setStaticIpAddress(str(v)));

        // Staff
        set(body, "noOfEmployees",     v -> o.setNoOfEmployees(num(v)));
        set(body, "noOfPostalTellers", v -> o.setNoOfPostalTellers(num(v)));
        set(body, "noOfLetterCarriers",v -> o.setNoOfLetterCarriers(num(v)));

        // Contacts
        set(body, "postalOfficeContactPerson", v -> o.setPostalOfficeContactPerson(str(v)));
        set(body, "postalOfficeContactNumber", v -> o.setPostalOfficeContactNumber(str(v)));
        set(body, "ispContactPerson",          v -> o.setIspContactPerson(str(v)));
        set(body, "ispContactNumber",          v -> o.setIspContactNumber(str(v)));
        set(body, "remarks",                   v -> o.setRemarks(str(v)));
    }

    // -- Diff --

    private List<String> diff(Snapshot b, PostalOffice a) {
        List<String> lines = new ArrayList<>();
        cmp(lines, "Name",           b.name,            a.getName());
        cmp(lines, "Postmaster",     b.postmaster,       a.getPostmaster());
        cmp(lines, "Classification", b.classification,   a.getClassification());
        cmp(lines, "Services",       b.serviceProvided,  a.getServiceProvided());
        cmp(lines, "Address",        b.address,          a.getAddress());
        cmp(lines, "Zip Code",       b.zipCode,          a.getZipCode());
        if (!Objects.equals(b.connectionStatus, a.getConnectionStatus()))
            lines.add("Status: " + label(b.connectionStatus) + " -> " + label(a.getConnectionStatus()));
        cmp(lines, "ISP",        b.isp,      a.getInternetServiceProvider());
        cmp(lines, "Conn. Type", b.connType, a.getTypeOfConnection());
        cmp(lines, "Speed",      b.speed,    a.getSpeed());
        cmp(lines, "Static IP",  b.staticIp, a.getStaticIpAddress());
        cmpNum(lines, "Employees", b.employees, a.getNoOfEmployees());
        cmpNum(lines, "Tellers",   b.tellers,   a.getNoOfPostalTellers());
        cmpNum(lines, "Carriers",  b.carriers,  a.getNoOfLetterCarriers());
        cmp(lines, "Office Contact", b.contactPerson,    a.getPostalOfficeContactPerson());
        cmp(lines, "Office #",       b.contactNumber,    a.getPostalOfficeContactNumber());
        cmp(lines, "ISP Contact",    b.ispContactPerson, a.getIspContactPerson());
        cmp(lines, "ISP #",          b.ispContactNumber, a.getIspContactNumber());
        cmp(lines, "Remarks",        b.remarks,          a.getRemarks());
        return lines;
    }

    private void cmp(List<String> out, String lbl, String b, String a) {
        if (!blank(b).equals(blank(a))) out.add(lbl + ": " + blank(b) + " -> " + blank(a));
    }
    private void cmpNum(List<String> out, String lbl, Integer b, Integer a) {
        String bv = b == null ? "?" : String.valueOf(b);
        String av = a == null ? "?" : String.valueOf(a);
        if (!bv.equals(av)) out.add(lbl + ": " + bv + " -> " + av);
    }
    private String blank(String s) { return (s == null || s.isBlank()) ? "?" : s.trim(); }
    private String label(Boolean b){ return Boolean.TRUE.equals(b) ? "Active" : "Inactive"; }

    private ConnectivityNotification.Type resolveType(Snapshot b, PostalOffice a) {
        if (!Objects.equals(b.connectionStatus, a.getConnectionStatus()))
            return Boolean.TRUE.equals(a.getConnectionStatus())
                   ? ConnectivityNotification.Type.CONNECTED
                   : ConnectivityNotification.Type.DISCONNECTED;
        return ConnectivityNotification.Type.UPDATED;
    }

    // -- Snapshot --

    private static class Snapshot {
        String  name, postmaster, classification, serviceProvided, address, zipCode, officeStatus;
        Boolean connectionStatus;
        String  isp, connType, speed, staticIp;
        Integer employees, tellers, carriers;
        String  contactPerson, contactNumber, ispContactPerson, ispContactNumber, remarks;

        static Snapshot of(PostalOffice o) {
            Snapshot s = new Snapshot();
            s.name             = o.getName();
            s.postmaster       = o.getPostmaster();
            s.classification   = o.getClassification();
            s.serviceProvided  = o.getServiceProvided();
            s.address          = o.getAddress();
            s.zipCode          = o.getZipCode();
            s.officeStatus     = o.getOfficeStatus();
            s.connectionStatus = o.getConnectionStatus();
            s.isp              = o.getInternetServiceProvider();
            s.connType         = o.getTypeOfConnection();
            s.speed            = o.getSpeed();
            s.staticIp         = o.getStaticIpAddress();
            s.employees        = o.getNoOfEmployees();
            s.tellers          = o.getNoOfPostalTellers();
            s.carriers         = o.getNoOfLetterCarriers();
            s.contactPerson    = o.getPostalOfficeContactPerson();
            s.contactNumber    = o.getPostalOfficeContactNumber();
            s.ispContactPerson = o.getIspContactPerson();
            s.ispContactNumber = o.getIspContactNumber();
            s.remarks          = o.getRemarks();
            return s;
        }
    }

    // -- Generic helpers --

    private String actor(Authentication auth) {
        return (auth != null && auth.getName() != null) ? auth.getName() : "unknown";
    }
    private void set(Map<String, Object> body, String key, java.util.function.Consumer<Object> setter) {
        if (body.containsKey(key)) setter.accept(body.get(key));
    }
    private String  str(Object v)  { return v == null ? null : v.toString().trim(); }
    private Boolean bool(Object v) {
        if (v instanceof Boolean) return (Boolean) v;
        return Boolean.parseBoolean(v == null ? "false" : v.toString());
    }
    private Integer num(Object v) {
        if (v == null) return null;
        if (v instanceof Number) return ((Number) v).intValue();
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return null; }
    }
    private ResponseEntity<?> error(int status, String msg) {
        return ResponseEntity.status(status).body(Map.of("success", false, "message", msg));
    }

    private String activeRequestBlockMessage(Integer officeId) {
        Optional<ApprovalRequest> active = approvalService.getLatestActiveRequestForOffice(officeId);
        if (active.isEmpty()) {
            return "There is already a pending approval request for this office.";
        }

        ApprovalRequest req = active.get();
        if (req.getStatus() == ApprovalRequest.RequestStatus.AREA_APPROVED) {
            return "This office already has a request waiting for SRD Operation final approval.";
        }
        return "This office already has a pending request waiting for Area Admin review.";
    }
}
