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

    List<Connectivity> findByPostalOfficeId(Integer officeId);
    List<Connectivity> findByProviderProviderId(Integer providerId);
    List<Connectivity> findByIsWiredTrue();
    List<Connectivity> findByIsFreeTrue();

    // ── Date-range queries (with eager fetch to avoid LazyInit) ───────────────

    @Query("SELECT c FROM Connectivity c JOIN FETCH c.postalOffice po LEFT JOIN FETCH po.area " +
           "WHERE COALESCE(c.dateConnected, c.createdStamp) BETWEEN :startDate AND :endDate " +
           "AND po.isArchived = false")
    List<Connectivity> findByDateConnectedBetween(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate")   LocalDateTime endDate);

    @Query("SELECT c FROM Connectivity c JOIN FETCH c.postalOffice po LEFT JOIN FETCH po.area " +
           "WHERE c.dateDisconnected BETWEEN :startDate AND :endDate " +
           "AND po.isArchived = false")
    List<Connectivity> findByDateDisconnectedBetween(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate")   LocalDateTime endDate);

    // ── Active during a quarter (used by QuartersApiController table) ─────────

    @Query("SELECT c FROM Connectivity c JOIN FETCH c.postalOffice po LEFT JOIN FETCH po.area " +
           "WHERE c.dateConnected <= :quarterEnd " +
           "AND (c.dateDisconnected IS NULL OR c.dateDisconnected >= :quarterStart) " +
           "AND po.isArchived = false")
    List<Connectivity> findActiveInQuarter(
        @Param("quarterStart") LocalDateTime quarterStart,
        @Param("quarterEnd")   LocalDateTime quarterEnd);

    // ── Active at a specific point in time ───────────────────────────────────
    // Uses COALESCE(dateConnected, createdStamp) as the effective connect date.
    // This handles records that were encoded after-the-fact (dateConnected defaults
    // to now() on @PrePersist but the office may have been connected earlier).
    // Rule: connected if effective_date <= checkDate AND not yet disconnected at checkDate.

    @Query("SELECT c FROM Connectivity c JOIN FETCH c.postalOffice po LEFT JOIN FETCH po.area " +
           "WHERE po.isArchived = false " +
           "AND COALESCE(c.dateConnected, c.createdStamp) <= :checkDate " +
           "AND (c.dateDisconnected IS NULL OR c.dateDisconnected > :checkDate)")
    List<Connectivity> findActiveAtDate(@Param("checkDate") LocalDateTime checkDate);

    // ── Inactive at a specific point in time ─────────────────────────────────
    // An office is inactive at checkDate if its LATEST connectivity record
    // was disconnected on or before checkDate (i.e. not reconnected afterward).

    @Query("SELECT c FROM Connectivity c JOIN FETCH c.postalOffice po LEFT JOIN FETCH po.area " +
           "WHERE po.isArchived = false " +
           "AND c.dateDisconnected IS NOT NULL " +
           "AND c.dateDisconnected <= :checkDate " +
           "AND NOT EXISTS (" +
           "  SELECT c2 FROM Connectivity c2 " +
           "  WHERE c2.postalOffice.id = po.id " +
           "  AND COALESCE(c2.dateConnected, c2.createdStamp) <= :checkDate " +
           "  AND (c2.dateDisconnected IS NULL OR c2.dateDisconnected > :checkDate)" +
           ")")
    List<Connectivity> findInactiveAtDate(@Param("checkDate") LocalDateTime checkDate);

    // ── Misc queries ──────────────────────────────────────────────────────────

    @Query("SELECT c FROM Connectivity c WHERE c.dateConnected IS NOT NULL AND c.dateDisconnected IS NULL")
    List<Connectivity> findAllActive();

    @Query("SELECT c FROM Connectivity c WHERE c.dateConnected IS NOT NULL AND c.dateDisconnected IS NOT NULL")
    List<Connectivity> findAllInactive();

    @Query("SELECT COUNT(c) FROM Connectivity c WHERE YEAR(c.dateConnected) = :year AND QUARTER(c.dateConnected) = :quarter")
    Long countConnectionsInQuarter(@Param("year") Integer year, @Param("quarter") Integer quarter);

    @Query("SELECT COUNT(c) FROM Connectivity c WHERE YEAR(c.dateDisconnected) = :year AND QUARTER(c.dateDisconnected) = :quarter")
    Long countDisconnectionsInQuarter(@Param("year") Integer year, @Param("quarter") Integer quarter);

    @Query("SELECT c FROM Connectivity c WHERE YEAR(c.dateConnected) = :year AND QUARTER(c.dateConnected) = :quarter ORDER BY c.dateConnected DESC")
    List<Connectivity> findConnectionsInQuarter(@Param("year") Integer year, @Param("quarter") Integer quarter);

    @Query("SELECT c FROM Connectivity c WHERE YEAR(c.dateDisconnected) = :year AND QUARTER(c.dateDisconnected) = :quarter ORDER BY c.dateDisconnected DESC")
    List<Connectivity> findDisconnectionsInQuarter(@Param("year") Integer year, @Param("quarter") Integer quarter);

    @Query("SELECT COUNT(DISTINCT c.postalOffice.id) FROM Connectivity c WHERE c.dateConnected >= :quarterStart AND c.dateConnected < :quarterEnd")
    Long countNewlyConnectedInQuarter(@Param("quarterStart") LocalDateTime quarterStart, @Param("quarterEnd") LocalDateTime quarterEnd);

    @Query("SELECT COUNT(DISTINCT c.postalOffice.id) FROM Connectivity c WHERE c.dateDisconnected >= :quarterStart AND c.dateDisconnected < :quarterEnd")
    Long countNewlyDisconnectedInQuarter(@Param("quarterStart") LocalDateTime quarterStart, @Param("quarterEnd") LocalDateTime quarterEnd);

    @Query("SELECT c FROM Connectivity c WHERE c.postalOffice.id = :officeId ORDER BY c.dateConnected DESC")
    List<Connectivity> findByOfficeIdOrderByDateConnectedDesc(@Param("officeId") Integer officeId);
}