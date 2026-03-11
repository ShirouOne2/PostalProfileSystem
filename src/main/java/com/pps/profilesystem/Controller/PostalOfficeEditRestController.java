package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST endpoints used by edit-modal.js
 *
 *  GET  /api/postal-office/{id}  →  fetch office data for the modal
 *  PUT  /api/postal-office/{id}  →  save changes from the modal
 */
@RestController
@RequestMapping("/api/postal-office")
public class PostalOfficeEditRestController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    /* ── GET ──────────────────────────────────────────────────── */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getOffice(@PathVariable Integer id) {
        return postalOfficeRepository.findById(id)
            .<ResponseEntity<?>>map(o -> {
                Map<String, Object> d = new LinkedHashMap<>();
                d.put("id",                         o.getId());
                d.put("name",                       o.getName());
                d.put("postmaster",                 o.getPostmaster());
                d.put("address",                    o.getAddress());
                d.put("zipCode",                    o.getZipCode());
                d.put("connectionStatus",           o.getConnectionStatus());
                d.put("internetServiceProvider",    o.getInternetServiceProvider());
                d.put("typeOfConnection",           o.getTypeOfConnection());
                d.put("speed",                      o.getSpeed());
                d.put("staticIpAddress",            o.getStaticIpAddress());
                d.put("noOfEmployees",              o.getNoOfEmployees());
                d.put("noOfPostalTellers",          o.getNoOfPostalTellers());
                d.put("noOfLetterCarriers",         o.getNoOfLetterCarriers());
                d.put("postalOfficeContactPerson",  o.getPostalOfficeContactPerson());
                d.put("postalOfficeContactNumber",  o.getPostalOfficeContactNumber());
                d.put("ispContactPerson",           o.getIspContactPerson());
                d.put("ispContactNumber",           o.getIspContactNumber());
                d.put("latitude",                   o.getLatitude());
                d.put("longitude",                  o.getLongitude());
                return ResponseEntity.ok(d);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /* ── PUT ──────────────────────────────────────────────────── */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateOffice(@PathVariable Integer id,
                                          @RequestBody Map<String, Object> body) {
        Optional<PostalOffice> opt = postalOfficeRepository.findById(id);
        if (opt.isEmpty()) {
            return error(404, "Office not found with ID: " + id);
        }
        try {
            PostalOffice o = opt.get();

            set(body, "name",                      v -> o.setName(v.toString().trim()));
            set(body, "postmaster",                v -> o.setPostmaster(str(v)));
            set(body, "address",                   v -> o.setAddress(str(v)));
            set(body, "zipCode",                   v -> o.setZipCode(str(v)));
            set(body, "connectionStatus",          v -> o.setConnectionStatus(bool(v)));
            set(body, "internetServiceProvider",   v -> o.setInternetServiceProvider(str(v)));
            set(body, "typeOfConnection",          v -> o.setTypeOfConnection(str(v)));
            set(body, "speed",                     v -> o.setSpeed(str(v)));
            set(body, "staticIpAddress",           v -> o.setStaticIpAddress(str(v)));
            set(body, "noOfEmployees",             v -> o.setNoOfEmployees(num(v)));
            set(body, "noOfPostalTellers",         v -> o.setNoOfPostalTellers(num(v)));
            set(body, "noOfLetterCarriers",        v -> o.setNoOfLetterCarriers(num(v)));
            set(body, "postalOfficeContactPerson", v -> o.setPostalOfficeContactPerson(str(v)));
            set(body, "postalOfficeContactNumber", v -> o.setPostalOfficeContactNumber(str(v)));
            set(body, "ispContactPerson",          v -> o.setIspContactPerson(str(v)));
            set(body, "ispContactNumber",          v -> o.setIspContactNumber(str(v)));
            set(body, "latitude",                  v -> {
                try { o.setLatitude(Double.parseDouble(v.toString())); } catch (Exception ignored) {}
            });
            set(body, "longitude",                 v -> {
                try { o.setLongitude(Double.parseDouble(v.toString())); } catch (Exception ignored) {}
            });

            postalOfficeRepository.save(o);

            Map<String, Object> ok = new HashMap<>();
            ok.put("success", true);
            ok.put("message", "Office updated successfully.");
            return ResponseEntity.ok(ok);

        } catch (Exception e) {
            return error(500, "Update failed: " + e.getMessage());
        }
    }

    /* ── helpers ──────────────────────────────────────────────── */
    private void set(Map<String, Object> body, String key,
                     java.util.function.Consumer<Object> setter) {
        if (body.containsKey(key)) setter.accept(body.get(key));
    }

    private String str(Object v)  { return v == null ? null : v.toString().trim(); }
    private Boolean bool(Object v){
        if (v instanceof Boolean) return (Boolean) v;
        return Boolean.parseBoolean(v == null ? "false" : v.toString());
    }
    private Integer num(Object v) {
        if (v == null) return null;
        if (v instanceof Number) return ((Number) v).intValue();
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return null; }
    }
    private ResponseEntity<?> error(int status, String msg) {
        Map<String, Object> e = new HashMap<>();
        e.put("success", false);
        e.put("message", msg);
        return ResponseEntity.status(status).body(e);
    }
}