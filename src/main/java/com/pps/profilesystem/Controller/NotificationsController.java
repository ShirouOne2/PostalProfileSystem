package com.pps.profilesystem.Controller;

import com.pps.profilesystem.DTO.ConnectivityNotification;
import com.pps.profilesystem.Service.ConnectivityNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
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
 * Accessible by System Admin (role 1), Area Admin (role 2), User (role 3),
 * and SRD Operation (role 4).
 */
@Controller
@RequestMapping("/notifications")
@PreAuthorize("hasAnyRole('ADMIN', 'AREA_ADMIN', 'USER', 'SRD_OPERATION')")
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
            @RequestParam(required = false) String dateRange,
            Authentication auth) {
        
        String userEmail = auth != null ? auth.getName() : null;
        List<ConnectivityNotification> allNotifications = notifService.getAllForUser(userEmail);
        
        // Apply filters (unknown status values behave as "all" so the inbox never goes blank)
        List<ConnectivityNotification> filteredNotifications = allNotifications.stream()
                .filter(n -> matchesStatusFilter(n, status, userEmail))
                .filter(n -> matchesType(n, type))
                .filter(n -> dateRange == null || dateRange.isEmpty() || 
                           isInDateRange(n.getTimestamp(), dateRange))
                .collect(Collectors.toList());

        // Build response
        Map<String, Object> response = new HashMap<>();
        response.put("notifications", filteredNotifications.stream()
                .map(n -> serializeNotification(n, userEmail))
                .collect(Collectors.toList()));
        response.put("totalCount", allNotifications.size());
        response.put("unreadCount", allNotifications.stream().mapToInt(n -> n.isReadBy(userEmail) ? 0 : 1).sum());
        response.put("readCount", allNotifications.stream().mapToInt(n -> n.isReadBy(userEmail) ? 1 : 0).sum());
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
    public Map<String, Object> getNotificationStats(Authentication auth) {
        String userEmail = auth != null ? auth.getName() : null;
        List<ConnectivityNotification> allNotifications = notifService.getAllForUser(userEmail);
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalCount", allNotifications.size());
        stats.put("unreadCount", allNotifications.stream().mapToInt(n -> n.isReadBy(userEmail) ? 0 : 1).sum());
        stats.put("readCount", allNotifications.stream().mapToInt(n -> n.isReadBy(userEmail) ? 1 : 0).sum());
        stats.put("todayCount", allNotifications.stream()
                .mapToInt(n -> n.getTimestamp().toLocalDate().equals(LocalDateTime.now().toLocalDate()) ? 1 : 0)
                .sum());
        
        return stats;
    }

    /**
     * Helper method to check if a timestamp falls within a date range
     */
    private boolean matchesStatusFilter(ConnectivityNotification n, String status, String userEmail) {
        if (status == null || status.isBlank()) {
            return true;
        }
        String s = status.trim().toLowerCase();
        if ("all".equals(s)) {
            return true;
        }
        if ("read".equals(s)) {
            return n.isReadBy(userEmail);
        }
        if ("unread".equals(s)) {
            return !n.isReadBy(userEmail);
        }
        return true;
    }

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

    private boolean matchesType(ConnectivityNotification notification, String type) {
        if (type == null || type.isBlank()) return true;
        String normalized = type.trim().toUpperCase();
        if ("CONNECTIVITY".equals(normalized) || "OFFICE".equals(normalized) || "SYSTEM".equals(normalized)) {
            return true;
        }
        return notification.getType().name().equalsIgnoreCase(normalized);
    }

    private Map<String, Object> serializeNotification(ConnectivityNotification n, String userEmail) {
        Map<String, Object> out = new HashMap<>();
        out.put("id", n.getId());
        out.put("type", n.getType().name());
        out.put("typeLabel", n.getTypeLabel());
        out.put("icon", n.getIcon());
        out.put("color", n.getColor());
        out.put("officeName", n.getOfficeName());
        out.put("officeId", n.getOfficeId());
        out.put("changedBy", n.getChangedBy());
        out.put("detail", n.getDetail());
        out.put("timestamp", n.getTimestamp());
        out.put("timestampFormatted", n.getTimestampFormatted());
        out.put("read", n.isReadBy(userEmail));
        return out;
    }
}
