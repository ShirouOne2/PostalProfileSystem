package com.pps.profilesystem.Controller;

import com.pps.profilesystem.DTO.ConnectivityNotification;
import com.pps.profilesystem.Service.ConnectivityNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * NotificationsController
 *
 * Handles the notifications inbox page for admin users.
 * Provides a full-page view of all notifications with filtering and pagination.
 * Accessible by System Admin (role 1) AND Area Admin (role 2).
 */
@Controller
@RequestMapping("/notifications")
@PreAuthorize("hasAnyRole('ADMIN', 'AREA_ADMIN')")
public class NotificationsController {

    @Autowired
    private ConnectivityNotificationService notifService;

    /**
     * Display the notifications inbox page
     */
    @GetMapping
    public String notifications(Model model) {
        model.addAttribute("activePage", "notifications");
        return "notifications";
    }

    /**
     * API endpoint to get all notifications with optional filtering
     */
    @GetMapping("/api/list")
    @ResponseBody
    public Map<String, Object> getNotifications(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String dateRange) {
        
        List<ConnectivityNotification> allNotifications = notifService.getAll();
        
        // Apply filters
        List<ConnectivityNotification> filteredNotifications = allNotifications.stream()
                .filter(n -> status == null || status.isEmpty() || 
                           (status.equals("read") && n.isRead()) || 
                           (status.equals("unread") && !n.isRead()))
                .filter(n -> type == null || type.isEmpty() || 
                           n.getType().toString().equalsIgnoreCase(type))
                .filter(n -> dateRange == null || dateRange.isEmpty() || 
                           isInDateRange(n.getTimestamp(), dateRange))
                .collect(Collectors.toList());

        // Build response
        Map<String, Object> response = new HashMap<>();
        response.put("notifications", filteredNotifications);
        response.put("totalCount", allNotifications.size());
        response.put("unreadCount", allNotifications.stream().mapToInt(n -> n.isRead() ? 0 : 1).sum());
        response.put("readCount", allNotifications.stream().mapToInt(n -> n.isRead() ? 1 : 0).sum());
        response.put("todayCount", allNotifications.stream()
                .mapToInt(n -> n.getTimestamp().toLocalDate().equals(LocalDateTime.now().toLocalDate()) ? 1 : 0)
                .sum());
        response.put("filteredCount", filteredNotifications.size());
        
        return response;
    }

    /**
     * API endpoint to get notification statistics
     */
    @GetMapping("/api/stats")
    @ResponseBody
    public Map<String, Object> getNotificationStats() {
        List<ConnectivityNotification> allNotifications = notifService.getAll();
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalCount", allNotifications.size());
        stats.put("unreadCount", allNotifications.stream().mapToInt(n -> n.isRead() ? 0 : 1).sum());
        stats.put("readCount", allNotifications.stream().mapToInt(n -> n.isRead() ? 1 : 0).sum());
        stats.put("todayCount", allNotifications.stream()
                .mapToInt(n -> n.getTimestamp().toLocalDate().equals(LocalDateTime.now().toLocalDate()) ? 1 : 0)
                .sum());
        
        return stats;
    }

    /**
     * Helper method to check if a timestamp falls within a date range
     */
    private boolean isInDateRange(LocalDateTime timestamp, String dateRange) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start;
        
        switch (dateRange.toLowerCase()) {
            case "today":
                return timestamp.toLocalDate().equals(now.toLocalDate());
            case "week":
                start = now.minusWeeks(1);
                return timestamp.isAfter(start);
            case "month":
                start = now.minusMonths(1);
                return timestamp.isAfter(start);
            default:
                return true;
        }
    }
}
