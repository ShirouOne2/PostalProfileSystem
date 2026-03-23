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

    // ── Date-range queries ────────────────────────────────────────────────────
    // Use NOT EXISTS correlated subquery to exclude archived offices —
    // avoids Hibernate deriving postal_office_id from the JPQL path.

    @Query("SELECT c FROM Connectivity c JOIN FETCH c.postalOffice po LEFT JOIN FETCH po.area " +
           "WHERE COALESCE(c.dateConnected, c.createdStamp) BETWEEN :startDate AND :endDate " +
           "AND NOT EXISTS (SELECT 1 FROM ArchivedOffice ao WHERE ao.postalOffice = po)")
    List<Connectivity> findByDateConnectedBetween(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate")   LocalDateTime endDate);

    @Query("SELECT c FROM Connectivity c JOIN FETCH c.postalOffice po LEFT JOIN FETCH po.area " +
           "WHERE c.dateDisconnected BETWEEN :startDate AND :endDate " +
           "AND NOT EXISTS (SELECT 1 FROM ArchivedOffice ao WHERE ao.postalOffice = po)")
    List<Connectivity> findByDateDisconnectedBetween(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate")   LocalDateTime endDate);

    @Query("SELECT c FROM Connectivity c JOIN FETCH c.postalOffice po LEFT JOIN FETCH po.area " +
           "WHERE c.dateConnected <= :quarterEnd " +
           "AND (c.dateDisconnected IS NULL OR c.dateDisconnected >= :quarterStart) " +
           "AND NOT EXISTS (SELECT 1 FROM ArchivedOffice ao WHERE ao.postalOffice = po)")
    List<Connectivity> findActiveInQuarter(
        @Param("quarterStart") LocalDateTime quarterStart,
        @Param("quarterEnd")   LocalDateTime quarterEnd);

    @Query("SELECT c FROM Connectivity c JOIN FETCH c.postalOffice po LEFT JOIN FETCH po.area " +
           "WHERE NOT EXISTS (SELECT 1 FROM ArchivedOffice ao WHERE ao.postalOffice = po) " +
           "AND COALESCE(c.dateConnected, c.createdStamp) <= :checkDate " +
           "AND (c.dateDisconnected IS NULL OR c.dateDisconnected > :checkDate)")
    List<Connectivity> findActiveAtDate(@Param("checkDate") LocalDateTime checkDate);

    @Query("SELECT c FROM Connectivity c JOIN FETCH c.postalOffice po LEFT JOIN FETCH po.area " +
           "WHERE NOT EXISTS (SELECT 1 FROM ArchivedOffice ao WHERE ao.postalOffice = po) " +
           "AND c.dateDisconnected IS NOT NULL " +
           "AND c.dateDisconnected <= :checkDate " +
           "AND NOT EXISTS (" +
           "  SELECT c2 FROM Connectivity c2 " +
           "  WHERE c2.postalOffice.id = po.id " +
           "  AND COALESCE(c2.dateConnected, c2.createdStamp) <= :checkDate " +
           "  AND (c2.dateDisconnected IS NULL OR c2.dateDisconnected > :checkDate)" +
           ")")
    List<Connectivity> findInactiveAtDate(@Param("checkDate") LocalDateTime checkDate);

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