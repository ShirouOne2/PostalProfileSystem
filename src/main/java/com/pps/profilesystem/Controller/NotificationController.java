package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.AuditLog;
import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.UserRepository;
import com.pps.profilesystem.Service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private UserRepository userRepository;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a");

    @GetMapping
    public ResponseEntity<Map<String, Object>> getNotifications() {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();

        boolean isAdmin = currentUser.getRole() != null && currentUser.getRole() == 1;
        Map<String, Object> result = new HashMap<>();

        if (isAdmin) {
            long count = auditLogService.getAdminUnreadCount();
            List<AuditLog> logs = auditLogService.getAdminNotifications();
            result.put("count", count);
            result.put("countLabel", count > 99 ? "99+" : String.valueOf(count));
            result.put("notifications", mapLogs(logs));
        } else {
            Integer areaId = currentUser.getAreaId();
            long count = auditLogService.getUserUnreadCount(areaId);
            List<AuditLog> logs = auditLogService.getUserNotifications(areaId);
            result.put("count", count);
            result.put("countLabel", count > 99 ? "99+" : String.valueOf(count));
            result.put("notifications", mapLogs(logs));
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/mark-read")
    public ResponseEntity<Void> markRead() {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();

        boolean isAdmin = currentUser.getRole() != null && currentUser.getRole() == 1;
        if (isAdmin) {
            auditLogService.markAllAdminRead();
        }
        return ResponseEntity.ok().build();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private List<Map<String, Object>> mapLogs(List<AuditLog> logs) {
        return logs.stream().map(log -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", log.getId());
            item.put("actionType", log.getActionType().name());
            item.put("entityType", log.getEntityType());
            item.put("description", log.getDescription());
            item.put("changedByUsername", log.getChangedByUsername());
            item.put("changedAt", log.getChangedAt() != null ? log.getChangedAt().format(FORMATTER) : "");
            item.put("isRead", log.isReadAdmin());
            item.put("icon", getIcon(log.getActionType()));
            item.put("badgeClass", getBadgeClass(log.getActionType()));
            item.put("officeId", log.getOfficeId());
            return item;
        }).collect(Collectors.toList());
    }

    private String getIcon(AuditLog.ActionType type) {
        switch (type) {
            case CREATED:      return "fas fa-plus-circle text-success";
            case UPDATED:      return "fas fa-edit text-warning";
            case CONNECTED:    return "fas fa-wifi text-primary";
            case DISCONNECTED: return "fas fa-times-circle text-danger";
            default:           return "fas fa-bell text-muted";
        }
    }

    private String getBadgeClass(AuditLog.ActionType type) {
        switch (type) {
            case CREATED:      return "success";
            case UPDATED:      return "warning";
            case CONNECTED:    return "primary";
            case DISCONNECTED: return "danger";
            default:           return "secondary";
        }
    }

    /**
     * FIX: CustomUserDetailsService stores EMAIL as principal name
     * (.withUsername(user.getEmail())), so auth.getName() = email, not username.
     * Use findByEmail() — NOT findByUsername().
     */
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        String email = auth.getName(); // principal = email
        return userRepository.findByEmail(email).orElse(null);
    }
}
