package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Service.PostalOfficeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * REST Controller for deleting postal offices
 * Uses PostalOfficeService instead of direct repository access
 */
@RestController
@RequestMapping("/api")
public class PostalOfficeDeleteController {

    @Autowired
    private PostalOfficeService postalOfficeService;

    /**
     * Delete a single postal office by ID
     * @param id The ID of the postal office to delete
     * @return Response indicating success or failure
     */
    @DeleteMapping("/postal-office/{id}")
    public ResponseEntity<Map<String, Object>> deletePostalOffice(@PathVariable Integer id) {
        try {
            // Check if office exists
            Optional<PostalOffice> officeOptional = postalOfficeService.getPostalOfficeById(id);
            
            if (officeOptional.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Post office not found with ID: " + id);
                return ResponseEntity.status(404).body(response);
            }
            
            String officeName = officeOptional.get().getName();
            
            // Delete the office using service
            postalOfficeService.deletePostalOffice(id);
            
            // Return success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Post office '" + officeName + "' deleted successfully");
            response.put("deletedId", id);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to delete post office: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Bulk delete postal offices
     * @param request Request body containing list of IDs
     * @return Response indicating success or failure
     */
    @DeleteMapping("/postal-office/bulk-delete")
    public ResponseEntity<Map<String, Object>> bulkDeletePostalOffices(@RequestBody Map<String, List<Integer>> request) {
        try {
            List<Integer> ids = request.get("ids");
            
            if (ids == null || ids.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "No office IDs provided");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Delete using service and get count
            int deletedCount = postalOfficeService.bulkDeletePostalOffices(ids);
            
            // Return success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", deletedCount + " post office(s) deleted successfully");
            response.put("deletedCount", deletedCount);
            response.put("requestedCount", ids.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to delete post offices: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Soft delete - mark as inactive instead of permanent deletion
     * @param id The ID of the postal office to soft delete
     * @return Response indicating success or failure
     */
    @PutMapping("/postal-office/{id}/soft-delete")
    public ResponseEntity<Map<String, Object>> softDeletePostalOffice(@PathVariable Integer id) {
        try {
            PostalOffice office = postalOfficeService.softDeletePostalOffice(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Post office '" + office.getName() + "' marked as inactive");
            response.put("id", id);
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(404).body(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to update post office: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}