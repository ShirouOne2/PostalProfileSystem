package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Service.ConnectivityHistoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST API Controller for managing quarterly connectivity snapshots
 */
@RestController
@RequestMapping("/api/connectivity-history")
public class ConnectivityHistoryController {

    @Autowired
    private ConnectivityHistoryService connectivityHistoryService;

    /**
     * Create snapshot for current quarter
     */
    @PostMapping("/snapshot/current")
    public ResponseEntity<Map<String, Object>> createCurrentSnapshot() {
        try {
            Map<String, Object> result = connectivityHistoryService.createCurrentQuarterSnapshot();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to create snapshot: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Create snapshot for specific quarter
     */
    @PostMapping("/snapshot")
    public ResponseEntity<Map<String, Object>> createSnapshot(
            @RequestParam int year,
            @RequestParam int quarter) {
        try {
            if (quarter < 1 || quarter > 4) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Quarter must be between 1 and 4");
                return ResponseEntity.badRequest().body(error);
            }

            Map<String, Object> result = connectivityHistoryService.createQuarterSnapshot(year, quarter);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to create snapshot: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Get statistics for a specific quarter
     */
    @GetMapping("/quarter/{year}/{quarter}")
    public ResponseEntity<Map<String, Object>> getQuarterStatistics(
            @PathVariable int year,
            @PathVariable int quarter) {
        try {
            Map<String, Object> stats = connectivityHistoryService.getQuarterlyStatistics(year, quarter);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to get statistics: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Get all available quarters with snapshots
     */
    @GetMapping("/quarters/all")
    public ResponseEntity<Map<String, Object>> getAllQuarters() {
        try {
            List<Map<String, Object>> quarters = connectivityHistoryService.getAllAvailableQuarters();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("quarters", quarters);
            response.put("count", quarters.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to get quarters: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Recreate snapshot for a specific quarter (delete old and create new)
     */
    @PutMapping("/snapshot/recreate")
    public ResponseEntity<Map<String, Object>> recreateSnapshot(
            @RequestParam int year,
            @RequestParam int quarter) {
        try {
            if (quarter < 1 || quarter > 4) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Quarter must be between 1 and 4");
                return ResponseEntity.badRequest().body(error);
            }

            Map<String, Object> result = connectivityHistoryService.recreateQuarterSnapshot(year, quarter);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to recreate snapshot: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Get current quarter information
     */
    @GetMapping("/current-quarter")
    public ResponseEntity<Map<String, Object>> getCurrentQuarter() {
        try {
            Map<String, Object> info = connectivityHistoryService.getCurrentQuarterInfo();
            return ResponseEntity.ok(info);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to get current quarter info: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Delete snapshot for a specific quarter
     */
    @DeleteMapping("/snapshot/{year}/{quarter}")
    public ResponseEntity<Map<String, Object>> deleteSnapshot(
            @PathVariable int year,
            @PathVariable int quarter) {
        try {
            if (quarter < 1 || quarter > 4) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Quarter must be between 1 and 4");
                return ResponseEntity.badRequest().body(error);
            }

            connectivityHistoryService.deleteQuarterSnapshot(year, quarter);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Snapshot deleted successfully for Q" + quarter + " " + year);
            response.put("year", year);
            response.put("quarter", quarter);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to delete snapshot: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Delete snapshot for current quarter
     */
    @DeleteMapping("/snapshot/current")
    public ResponseEntity<Map<String, Object>> deleteCurrentSnapshot() {
        try {
            Map<String, Object> currentQuarter = connectivityHistoryService.getCurrentQuarterInfo();
            int year = (Integer) currentQuarter.get("year");
            int quarter = (Integer) currentQuarter.get("quarter");

            connectivityHistoryService.deleteQuarterSnapshot(year, quarter);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Current quarter snapshot deleted successfully");
            response.put("year", year);
            response.put("quarter", quarter);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to delete current snapshot: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}