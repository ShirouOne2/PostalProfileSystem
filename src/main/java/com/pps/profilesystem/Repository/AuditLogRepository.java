package com.pps.profilesystem.Repository;

import com.pps.profilesystem.Entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    // Admin: all unread notifications, newest first
    List<AuditLog> findByIsReadAdminFalseOrderByChangedAtDesc();

    // Admin: count unread
    long countByIsReadAdminFalse();

    // Admin: recent 20 notifications (for dropdown)
    List<AuditLog> findTop20ByOrderByChangedAtDesc();

    // User (area-based): only CONNECTED/DISCONNECTED for their area, unread
    @Query("SELECT a FROM AuditLog a WHERE a.areaId = :areaId " +
           "AND a.actionType IN ('CONNECTED', 'DISCONNECTED') " +
           "ORDER BY a.changedAt DESC")
    List<AuditLog> findConnectivityNotificationsByArea(@Param("areaId") Integer areaId);

    // User (area-based): count unread connectivity events for their area
    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.areaId = :areaId " +
           "AND a.actionType IN (com.pps.profilesystem.Entity.AuditLog.ActionType.CONNECTED, " +
           "com.pps.profilesystem.Entity.AuditLog.ActionType.DISCONNECTED) " +
           "AND a.isReadAdmin = false")
    long countUnreadConnectivityByArea(@Param("areaId") Integer areaId);

    // Recent 20 for user area
    @Query("SELECT a FROM AuditLog a WHERE a.areaId = :areaId " +
           "AND a.actionType IN (com.pps.profilesystem.Entity.AuditLog.ActionType.CONNECTED, " +
           "com.pps.profilesystem.Entity.AuditLog.ActionType.DISCONNECTED) " +
           "ORDER BY a.changedAt DESC")
    List<AuditLog> findTop20ConnectivityByArea(@Param("areaId") Integer areaId);
}
