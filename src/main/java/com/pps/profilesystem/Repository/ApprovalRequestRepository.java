package com.pps.profilesystem.Repository;

import com.pps.profilesystem.Entity.ApprovalRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, Long> {

    List<ApprovalRequest> findByStatusAndAreaId(
            ApprovalRequest.RequestStatus status,
            Integer areaId);

    List<ApprovalRequest> findByAreaIdOrderByRequestedAtDesc(Integer areaId);

    List<ApprovalRequest> findByRequestedByOrderByRequestedAtDesc(String requestedBy);

    List<ApprovalRequest> findByStatusOrderByRequestedAtDesc(ApprovalRequest.RequestStatus status);

    List<ApprovalRequest> findByOfficeIdOrderByRequestedAtDesc(Integer officeId);

    List<ApprovalRequest> findByRequestTypeAndStatusOrderByRequestedAtDesc(
            ApprovalRequest.RequestType requestType,
            ApprovalRequest.RequestStatus status);

    long countByStatusAndAreaId(ApprovalRequest.RequestStatus status, Integer areaId);

    long countByStatus(ApprovalRequest.RequestStatus status);

    List<ApprovalRequest> findByProcessedByOrderByProcessedAtDesc(String processedBy);

    @Query("SELECT ar FROM ApprovalRequest ar WHERE ar.requestedAt BETWEEN :startDate AND :endDate ORDER BY ar.requestedAt DESC")
    List<ApprovalRequest> findByRequestedAtBetween(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /** Requests visible to Area Admin: PENDING in their area */
    @Query("SELECT ar FROM ApprovalRequest ar WHERE ar.status = :status AND ar.area.id IN :areaIds ORDER BY ar.requestedAt DESC")
    List<ApprovalRequest> findByStatusAndAreaIds(
            @Param("status") ApprovalRequest.RequestStatus status,
            @Param("areaIds") List<Integer> areaIds);

    /** Requests visible to Operation: all AREA_APPROVED (across all areas) */
    List<ApprovalRequest> findByStatusOrderByRequestedAtAsc(ApprovalRequest.RequestStatus status);

    boolean existsByOfficeIdAndStatus(Integer officeId, ApprovalRequest.RequestStatus status);

    /** Any active (non-final) request for an office */
    @Query("SELECT COUNT(ar) > 0 FROM ApprovalRequest ar WHERE ar.officeId = :officeId AND ar.status IN ('PENDING','AREA_APPROVED')")
    boolean existsActiveRequestForOffice(@Param("officeId") Integer officeId);

    @Query("SELECT ar FROM ApprovalRequest ar WHERE ar.officeId = :officeId AND ar.status IN ('PENDING','AREA_APPROVED') ORDER BY ar.requestedAt DESC")
    List<ApprovalRequest> findActiveRequestsByOfficeId(@Param("officeId") Integer officeId);
}