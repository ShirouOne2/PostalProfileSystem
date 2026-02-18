package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Service.ArchiveService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * ArchiveController
 *
 * MVC:  GET  /archive           → archive.html (Thymeleaf page)
 * REST: POST /api/archive/{id}  → archive a single office
 * REST: POST /api/archive/bulk  → bulk archive
 * REST: POST /api/restore/{id}  → restore a single office
 * REST: POST /api/restore/bulk  → bulk restore
 */
@Controller
public class ArchiveController {

    @Autowired
    private ArchiveService archiveService;

    // ── Page ─────────────────────────────────────────────────────────────────

    @GetMapping("/archive")
    public String archivePage(Model model) {
        model.addAttribute("archivedOffices", archiveService.getAllArchivedOffices());
        model.addAttribute("archivedCount",   archiveService.getArchivedCount());
        model.addAttribute("activePage",      "archive");
        return "archive";
    }

    // ── Archive REST ──────────────────────────────────────────────────────────

    @PostMapping("/api/archive/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> archiveOne(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body) {

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
    public ResponseEntity<Map<String, Object>> archiveBulk(
            @RequestBody Map<String, Object> body) {

        @SuppressWarnings("unchecked")
        List<Integer> ids = (List<Integer>) body.get("ids");
        String reason = (String) body.getOrDefault("reason", "");

        if (ids == null || ids.isEmpty()) {
            return err("No office IDs provided.");
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
        try {
            PostalOffice office = archiveService.restoreOffice(id);
            return ok(true, "'" + office.getName() + "' has been restored to inventory.", null);
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    @PostMapping("/api/restore/bulk")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> restoreBulk(
            @RequestBody Map<String, Object> body) {

        @SuppressWarnings("unchecked")
        List<Integer> ids = (List<Integer>) body.get("ids");

        if (ids == null || ids.isEmpty()) {
            return err("No office IDs provided.");
        }
        try {
            int count = archiveService.bulkRestore(ids);
            return ok(true, count + " office(s) restored successfully.", Map.of("restoredCount", count));
        } catch (Exception e) {
            return err(e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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