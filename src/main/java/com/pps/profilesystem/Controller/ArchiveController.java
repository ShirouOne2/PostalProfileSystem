package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.ArchivedOffice;
import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.ArchivedOfficeRepository;
import com.pps.profilesystem.Repository.UserRepository;
import com.pps.profilesystem.Service.ArchiveService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
public class ArchiveController {

    @Autowired private ArchiveService archiveService;
    @Autowired private ArchivedOfficeRepository archivedOfficeRepository;
    @Autowired private UserRepository userRepository;

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }

    private boolean isSystemAdmin(User user) {
        return user != null && (Integer.valueOf(1).equals(user.getRole()) 
                             || Integer.valueOf(4).equals(user.getRole()));
    }

    // ── Page ─────────────────────────────────────────────────────────────────

    @GetMapping("/archive")
    public String archivePage(Model model) {
        User user = currentUser();

        // Pass ArchivedOffice records (not PostalOffice) so the template
        // can access archivedAt, archiveReason, archivedBy from the record
        List<ArchivedOffice> records;
        long count;

        if (isSystemAdmin(user)) {
            records = archivedOfficeRepository.findAllWithOffice();
            count   = archivedOfficeRepository.count();
        } else {
            Integer areaId = user != null ? user.getAreaId() : null;
            records = (areaId != null)
                    ? archivedOfficeRepository.findAllWithOfficeByArea(areaId)
                    : List.of();
            count = records.size();
        }

        model.addAttribute("archivedRecords", records);
        model.addAttribute("archivedCount",   count);
        model.addAttribute("activePage",      "archive");
        return "archive";
    }

    // ── Archive REST ──────────────────────────────────────────────────────────

    @PostMapping("/api/archive/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> archiveOne(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body) {

        User user = currentUser();
        if (!isSystemAdmin(user)) {
            String deny = checkAreaAccess(id, user);
            if (deny != null) return err(deny);
        }

        String reason = body != null ? body.getOrDefault("reason", "") : "";
        try {
            PostalOffice office = archiveService.archiveOffice(id, reason);
            return ok(true, "'" + office.getName() + "' has been archived.", null);
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/api/archive/bulk")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> archiveBulk(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Integer> ids = (List<Integer>) body.get("ids");
        String reason = (String) body.getOrDefault("reason", "");

        if (ids == null || ids.isEmpty()) return err("No office IDs provided.");

        User user = currentUser();
        if (!isSystemAdmin(user)) {
            ids = filterByArea(ids, user);
            if (ids.isEmpty()) return err("No offices in your area selected.");
        }

        try {
            int count = archiveService.bulkArchive(ids, reason);
            return ok(true, count + " office(s) archived successfully.", Map.of("archivedCount", count));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    // ── Restore REST ──────────────────────────────────────────────────────────

    @PostMapping("/api/restore/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> restoreOne(@PathVariable Integer id) {
        User user = currentUser();
        if (!isSystemAdmin(user)) {
            String deny = checkAreaAccess(id, user);
            if (deny != null) return err(deny);
        }
        try {
            PostalOffice office = archiveService.restoreOffice(id);
            return ok(true, "'" + office.getName() + "' has been restored to inventory.", null);
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/api/restore/bulk")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> restoreBulk(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Integer> ids = (List<Integer>) body.get("ids");
        if (ids == null || ids.isEmpty()) return err("No office IDs provided.");

        User user = currentUser();
        if (!isSystemAdmin(user)) {
            ids = filterByArea(ids, user);
            if (ids.isEmpty()) return err("No offices in your area selected.");
        }

        try {
            int count = archiveService.bulkRestore(ids);
            return ok(true, count + " office(s) restored successfully.", Map.of("restoredCount", count));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    // ── Area access helpers ───────────────────────────────────────────────────

    private String checkAreaAccess(Integer officeId, User user) {
        if (user == null || user.getAreaId() == null) return "Access denied — no area assigned.";
        return archivedOfficeRepository.findAllWithOffice().stream()
            .filter(a -> officeId.equals(a.getPostalOffice().getId()))
            .findFirst()
            .map(a -> {
                PostalOffice po = a.getPostalOffice();
                if (po.getArea() == null || !user.getAreaId().equals(po.getArea().getId())) {
                    return "Access denied — this office is not in your area.";
                }
                return null;
            })
            .orElse("Office not found.");
    }

    private List<Integer> filterByArea(List<Integer> ids, User user) {
        if (user == null || user.getAreaId() == null) return List.of();
        List<ArchivedOffice> areaRecords = archivedOfficeRepository.findAllWithOfficeByArea(user.getAreaId());
        java.util.Set<Integer> allowed = new java.util.HashSet<>();
        areaRecords.forEach(a -> allowed.add(a.getPostalOffice().getId()));
        return ids.stream().filter(allowed::contains).collect(java.util.stream.Collectors.toList());
    }

    private ResponseEntity<Map<String, Object>> ok(boolean success, String message, Map<String, Object> extra) {
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", success);
        resp.put("message", message);
        if (extra != null) resp.putAll(extra);
        return ResponseEntity.ok(resp);
    }

    private ResponseEntity<Map<String, Object>> err(String message) {
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", false);
        resp.put("message", message);
        return ResponseEntity.status(500).body(resp);
    }
}