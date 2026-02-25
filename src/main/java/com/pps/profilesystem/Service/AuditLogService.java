package com.pps.profilesystem.Service;

import com.pps.profilesystem.Entity.AuditLog;
import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuditLogService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    /**
     * Log a change - call this from any controller after saving an entity.
     */
    public void log(AuditLog.ActionType actionType,
                    String entityType,
                    Integer entityId,
                    Integer officeId,
                    Integer areaId,
                    String description,
                    User currentUser) {
        AuditLog log = new AuditLog();
        log.setActionType(actionType);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setOfficeId(officeId);
        log.setAreaId(areaId);
        log.setDescription(description);
        log.setChangedAt(LocalDateTime.now());
        log.setReadAdmin(false);

        if (currentUser != null) {
            log.setChangedBy(currentUser.getId());
            log.setChangedByUsername(currentUser.getUsername());
        }

        auditLogRepository.save(log);
    }

    /** Shorthand for connectivity events */
    public void logConnectivity(AuditLog.ActionType actionType,
                                 Integer officeId,
                                 Integer areaId,
                                 String officeName,
                                 String providerName,
                                 User currentUser) {
        String action = (actionType == AuditLog.ActionType.CONNECTED) ? "connected to" : "disconnected from";
        String desc = String.format("Office '%s' was %s provider '%s'", officeName, action, providerName);
        log(actionType, "Connectivity", officeId, officeId, areaId, desc, currentUser);
    }

    /** For admin: get all unread count */
    public long getAdminUnreadCount() {
        return auditLogRepository.countByIsReadAdminFalse();
    }

    /** For admin: get 20 most recent notifications */
    public List<AuditLog> getAdminNotifications() {
        return auditLogRepository.findTop20ByOrderByChangedAtDesc();
    }

    /** For user: count connectivity notifications by area */
    public long getUserUnreadCount(Integer areaId) {
        if (areaId == null) return 0;
        return auditLogRepository.countUnreadConnectivityByArea(areaId);
    }

    /** For user: get 20 most recent connectivity notifications by area */
    public List<AuditLog> getUserNotifications(Integer areaId) {
        if (areaId == null) return List.of();
        return auditLogRepository.findTop20ConnectivityByArea(areaId);
    }

    /** Mark all admin notifications as read */
    public void markAllAdminRead() {
        List<AuditLog> unread = auditLogRepository.findByIsReadAdminFalseOrderByChangedAtDesc();
        unread.forEach(a -> a.setReadAdmin(true));
        auditLogRepository.saveAll(unread);
    }
}

