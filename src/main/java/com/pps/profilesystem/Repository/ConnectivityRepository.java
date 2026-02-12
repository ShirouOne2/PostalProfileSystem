package com.pps.profilesystem.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.pps.profilesystem.Entity.Connectivity;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ConnectivityRepository extends JpaRepository<Connectivity, Integer> {

    // ==================== Existing Methods ====================

    // Find all connectivity records by a specific postal office
    List<Connectivity> findByPostalOfficeId(Integer officeId);

    // Find all connectivity records by provider
    List<Connectivity> findByProviderProviderId(Integer providerId);

    // Find all connectivity records created by a specific user
    List<Connectivity> findByCreatedById(Long userId);

    // Find all wired connections
    List<Connectivity> findByIsWiredTrue();

    // Find all free connections
    List<Connectivity> findByIsFreeTrue();

    // ==================== NEW: Date-Based Queries ====================

    /**
     * Find all connections established within a date range
     */
    List<Connectivity> findByDateConnectedBetween(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Find all disconnections within a date range
     */
    List<Connectivity> findByDateDisconnectedBetween(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Find all currently active connections (connected but not disconnected)
     */
    @Query("SELECT c FROM Connectivity c WHERE c.dateConnected IS NOT NULL AND c.dateDisconnected IS NULL")
    List<Connectivity> findAllActive();

    /**
     * Find all inactive connections (both connected and disconnected)
     */
    @Query("SELECT c FROM Connectivity c WHERE c.dateConnected IS NOT NULL AND c.dateDisconnected IS NOT NULL")
    List<Connectivity> findAllInactive();

    /**
     * Count connections established in a specific quarter
     */
    @Query("SELECT COUNT(c) FROM Connectivity c WHERE " +
           "YEAR(c.dateConnected) = :year AND " +
           "QUARTER(c.dateConnected) = :quarter")
    Long countConnectionsInQuarter(@Param("year") Integer year, @Param("quarter") Integer quarter);

    /**
     * Count disconnections in a specific quarter
     */
    @Query("SELECT COUNT(c) FROM Connectivity c WHERE " +
           "YEAR(c.dateDisconnected) = :year AND " +
           "QUARTER(c.dateDisconnected) = :quarter")
    Long countDisconnectionsInQuarter(@Param("year") Integer year, @Param("quarter") Integer quarter);

    /**
     * Find all connections established in a specific quarter
     */
    @Query("SELECT c FROM Connectivity c WHERE " +
           "YEAR(c.dateConnected) = :year AND " +
           "QUARTER(c.dateConnected) = :quarter " +
           "ORDER BY c.dateConnected DESC")
    List<Connectivity> findConnectionsInQuarter(@Param("year") Integer year, @Param("quarter") Integer quarter);

    /**
     * Find all disconnections in a specific quarter
     */
    @Query("SELECT c FROM Connectivity c WHERE " +
           "YEAR(c.dateDisconnected) = :year AND " +
           "QUARTER(c.dateDisconnected) = :quarter " +
           "ORDER BY c.dateDisconnected DESC")
    List<Connectivity> findDisconnectionsInQuarter(@Param("year") Integer year, @Param("quarter") Integer quarter);

    /**
     * Find all connections active during a specific quarter
     * (connected before or during quarter, and either not disconnected or disconnected after quarter)
     */
    @Query("SELECT c FROM Connectivity c WHERE " +
           "c.dateConnected <= :quarterEnd AND " +
           "(c.dateDisconnected IS NULL OR c.dateDisconnected >= :quarterStart)")
    List<Connectivity> findActiveInQuarter(@Param("quarterStart") LocalDateTime quarterStart, 
                                           @Param("quarterEnd") LocalDateTime quarterEnd);

    /**
     * Count offices that gained connectivity in a specific quarter
     */
    @Query("SELECT COUNT(DISTINCT c.postalOffice.id) FROM Connectivity c WHERE " +
           "c.dateConnected >= :quarterStart AND " +
           "c.dateConnected < :quarterEnd")
    Long countNewlyConnectedInQuarter(@Param("quarterStart") LocalDateTime quarterStart, 
                                      @Param("quarterEnd") LocalDateTime quarterEnd);

    /**
     * Count offices that lost connectivity in a specific quarter
     */
    @Query("SELECT COUNT(DISTINCT c.postalOffice.id) FROM Connectivity c WHERE " +
           "c.dateDisconnected >= :quarterStart AND " +
           "c.dateDisconnected < :quarterEnd")
    Long countNewlyDisconnectedInQuarter(@Param("quarterStart") LocalDateTime quarterStart, 
                                         @Param("quarterEnd") LocalDateTime quarterEnd);

    /**
     * Find offices with active connections at a specific point in time
     */
    @Query("SELECT c FROM Connectivity c WHERE " +
           "c.dateConnected <= :checkDate AND " +
           "(c.dateDisconnected IS NULL OR c.dateDisconnected > :checkDate)")
    List<Connectivity> findActiveAtDate(@Param("checkDate") LocalDateTime checkDate);

    /**
     * Get connectivity history for a specific office ordered by connection date
     */
    @Query("SELECT c FROM Connectivity c WHERE c.postalOffice.id = :officeId " +
           "ORDER BY c.dateConnected DESC")
    List<Connectivity> findByOfficeIdOrderByDateConnectedDesc(@Param("officeId") Integer officeId);
}