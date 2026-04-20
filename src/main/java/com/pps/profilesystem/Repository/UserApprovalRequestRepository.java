package com.pps.profilesystem.Repository;

import com.pps.profilesystem.Entity.UserApprovalRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserApprovalRequestRepository extends JpaRepository<UserApprovalRequest, Long> {
    
    // Find pending requests for Area Admin review
    @Query("SELECT ar FROM UserApprovalRequest ar WHERE ar.status = 'PENDING' ORDER BY ar.createdAt DESC")
    List<UserApprovalRequest> findPendingRequests();
    
    // Find requests approved by Area Admin (waiting for SRD review)
    @Query("SELECT ar FROM UserApprovalRequest ar WHERE ar.status = 'AREA_ADMIN_APPROVED' ORDER BY ar.areaAdminApprovedAt DESC")
    List<UserApprovalRequest> findAreaAdminApprovedRequests();
    
    // Find requests by user ID
    @Query("SELECT ar FROM UserApprovalRequest ar WHERE ar.userId = :userId ORDER BY ar.createdAt DESC")
    List<UserApprovalRequest> findByUserId(@Param("userId") Long userId);
    
    // Find requests requested by specific user
    @Query("SELECT ar FROM UserApprovalRequest ar WHERE ar.requestedBy = :requestedBy ORDER BY ar.createdAt DESC")
    List<UserApprovalRequest> findByRequestedBy(@Param("requestedBy") Long requestedBy);
    
    // Find pending requests created after specific date
    @Query("SELECT ar FROM UserApprovalRequest ar WHERE ar.status = 'PENDING' AND ar.createdAt >= :since ORDER BY ar.createdAt DESC")
    List<UserApprovalRequest> findPendingRequestsSince(@Param("since") LocalDateTime since);
    
    // Count pending requests for Area Admin
    @Query("SELECT COUNT(ar) FROM UserApprovalRequest ar WHERE ar.status = 'PENDING'")
    long countPendingRequests();
    
    // Count requests waiting for SRD approval
    @Query("SELECT COUNT(ar) FROM UserApprovalRequest ar WHERE ar.status = 'AREA_ADMIN_APPROVED'")
    long countSrdPendingRequests();
    
    // Find requests by status
    @Query("SELECT ar FROM UserApprovalRequest ar WHERE ar.status = :status ORDER BY ar.createdAt DESC")
    List<UserApprovalRequest> findByStatus(@Param("status") UserApprovalRequest.ApprovalStatus status);
    
    // Find recent requests (last 7 days)
    @Query("SELECT ar FROM UserApprovalRequest ar WHERE ar.createdAt >= :since ORDER BY ar.createdAt DESC")
    List<UserApprovalRequest> findRecentRequests(@Param("since") LocalDateTime since);
}
