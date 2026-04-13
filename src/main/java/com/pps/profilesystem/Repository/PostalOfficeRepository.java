package com.pps.profilesystem.Repository;

import com.pps.profilesystem.Entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
/**
 * PostalOfficeRepository
 *
 * Archive data lives in archived_offices table (postal_office_id FK).
 * Native SQL subqueries use 'postal_office_id' — the exact column name
 * Hibernate derives from the Java field 'postalOffice'.
 * JPQL fetch-join queries use NOT EXISTS correlated subquery.
 */
@Repository
public interface PostalOfficeRepository extends JpaRepository<PostalOffice, Integer> {

    List<PostalOffice> findByConnectionStatus(Boolean status);
    List<PostalOffice> findByNameContainingIgnoreCase(String name);
    List<PostalOffice> findByCityMunicipalityId(Integer cityMunId);
    long countByConnectionStatus(Boolean status);

    @Query("SELECT COUNT(DISTINCT po.area.id) FROM PostalOffice po WHERE po.area IS NOT NULL")
    long countDistinctAreas();

    @Query("SELECT po FROM PostalOffice po LEFT JOIN FETCH po.area " +
           "WHERE po.latitude IS NOT NULL AND po.longitude IS NOT NULL")
    List<PostalOffice> findAllWithAreaForMap();

    @Query("SELECT COUNT(DISTINCT c.postalOffice) FROM Connectivity c WHERE " +
           "YEAR(c.dateConnected) = :year AND MONTH(c.dateConnected) BETWEEN :startMonth AND :endMonth")
    long countConnectedInQuarter(@Param("year") int year, @Param("startMonth") int startMonth, @Param("endMonth") int endMonth);

    @Query("SELECT COUNT(DISTINCT c.postalOffice) FROM Connectivity c WHERE " +
           "YEAR(c.dateDisconnected) = :year AND MONTH(c.dateDisconnected) BETWEEN :startMonth AND :endMonth")
    long countDisconnectedInQuarter(@Param("year") int year, @Param("startMonth") int startMonth, @Param("endMonth") int endMonth);

    @Query("SELECT COUNT(DISTINCT c.postalOffice) FROM Connectivity c WHERE " +
           "c.dateConnected <= :quarterEnd AND (c.dateDisconnected IS NULL OR c.dateDisconnected > :quarterEnd)")
    long countActiveAtQuarterEnd(@Param("quarterEnd") LocalDateTime quarterEnd);

    @Query("SELECT DISTINCT po FROM PostalOffice po JOIN Connectivity c ON po.id = c.postalOffice.id " +
           "WHERE c.dateConnected BETWEEN :startDate AND :endDate")
    List<PostalOffice> findByDateConnectedBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    @Query("SELECT DISTINCT po FROM PostalOffice po JOIN Connectivity c ON po.id = c.postalOffice.id " +
           "WHERE c.dateDisconnected BETWEEN :startDate AND :endDate")
    List<PostalOffice> findByDateDisconnectedBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    // ── Non-archived queries ──────────────────────────────────────────────────

    @Query(value = "SELECT * FROM postal_offices WHERE id NOT IN (SELECT postal_office_id FROM archived_offices)",
           nativeQuery = true)
    List<PostalOffice> findByIsArchivedFalse();

    /**
     * Single-record fetch with ALL associations eagerly loaded.
     * Used by the profile popup API so lazy fields don't throw
     * LazyInitializationException when Jackson serializes the response.
     */
    @Query("SELECT po FROM PostalOffice po " +
           "LEFT JOIN FETCH po.activeConnectivity " +
           "LEFT JOIN FETCH po.area " +
           "LEFT JOIN FETCH po.region " +
           "LEFT JOIN FETCH po.province " +
           "LEFT JOIN FETCH po.cityMunicipality " +
           "LEFT JOIN FETCH po.barangay " +
           "WHERE po.id = :id")
    Optional<PostalOffice> findByIdWithAllAssociations(@Param("id") Integer id);

    @Query("SELECT DISTINCT po FROM PostalOffice po " +
           "LEFT JOIN FETCH po.activeConnectivity " +
           "LEFT JOIN FETCH po.area " +
           "LEFT JOIN FETCH po.region " +
           "LEFT JOIN FETCH po.province " +
           "LEFT JOIN FETCH po.cityMunicipality " +
           "LEFT JOIN FETCH po.barangay " +
           "WHERE NOT EXISTS (SELECT 1 FROM ArchivedOffice ao WHERE ao.postalOffice = po)")
    List<PostalOffice> findAllNonArchivedWithConnectivity();

    /**
     * Table-view query: fetches location hierarchy without activeConnectivity join
     * to avoid Hibernate DISTINCT issues that can cause region/province/city to appear null.
     * connectionStatus is read directly from the postal_offices column.
     */
    @Query("SELECT DISTINCT po FROM PostalOffice po " +
           "LEFT JOIN FETCH po.area " +
           "LEFT JOIN FETCH po.region " +
           "LEFT JOIN FETCH po.province " +
           "LEFT JOIN FETCH po.cityMunicipality " +
           "LEFT JOIN FETCH po.barangay " +
           "WHERE NOT EXISTS (SELECT 1 FROM ArchivedOffice ao WHERE ao.postalOffice = po)")
    List<PostalOffice> findAllNonArchivedForTable();

    @Query("SELECT DISTINCT po FROM PostalOffice po " +
           "LEFT JOIN FETCH po.activeConnectivity " +
           "LEFT JOIN FETCH po.area " +
           "LEFT JOIN FETCH po.region " +
           "LEFT JOIN FETCH po.province " +
           "LEFT JOIN FETCH po.cityMunicipality " +
           "LEFT JOIN FETCH po.barangay " +
           "WHERE NOT EXISTS (SELECT 1 FROM ArchivedOffice ao WHERE ao.postalOffice = po) " +
           "AND po.area.id = :areaId")
    List<PostalOffice> findAllNonArchivedByArea(@Param("areaId") Integer areaId);

    @Query(value = "SELECT COUNT(*) FROM postal_offices WHERE id NOT IN (SELECT postal_office_id FROM archived_offices)",
           nativeQuery = true)
    long countNonArchived();

    @Query(value = "SELECT COUNT(*) FROM postal_offices WHERE connection_status = :status " +
                   "AND id NOT IN (SELECT postal_office_id FROM archived_offices)",
           nativeQuery = true)
    long countNonArchivedByConnectionStatus(@Param("status") Boolean status);

    @Query(value = "SELECT COUNT(DISTINCT area_id) FROM postal_offices " +
                   "WHERE area_id IS NOT NULL AND id NOT IN (SELECT postal_office_id FROM archived_offices)",
           nativeQuery = true)
    long countDistinctAreasNonArchived();

    @Query("SELECT DISTINCT po FROM PostalOffice po " +
           "LEFT JOIN FETCH po.area " +
           "WHERE po.latitude IS NOT NULL AND po.longitude IS NOT NULL " +
           "AND NOT EXISTS (SELECT 1 FROM ArchivedOffice ao WHERE ao.postalOffice = po)")
    List<PostalOffice> findAllWithAreaForMapNonArchived();

    @Query("SELECT po FROM PostalOffice po WHERE po.longitude = :longitude AND po.latitude = :latitude")
    List<PostalOffice> findByLongitudeAndLatitude(@Param("longitude") Double longitude, @Param("latitude") Double latitude);

    List<PostalOffice> findByZipCode(String zipCode);

    @Query(value = "SELECT COUNT(DISTINCT c.OfficeID) FROM connectivity c " +
                   "WHERE c.date_connected <= :refDate " +
                   "AND (c.date_disconnected IS NULL OR c.date_disconnected > :refDate) " +
                   "AND c.OfficeID NOT IN (SELECT postal_office_id FROM archived_offices) " +
                   "AND (:areaId IS NULL OR (SELECT area_id FROM postal_offices WHERE id = c.OfficeID) = :areaId)",
           nativeQuery = true)
    long countActiveAtYearEndByArea(@Param("refDate") LocalDateTime refDate, @Param("areaId") Integer areaId);

    @Query(value = "SELECT COUNT(*) FROM postal_offices " +
                   "WHERE id NOT IN (SELECT postal_office_id FROM archived_offices) " +
                   "AND (:areaId IS NULL OR area_id = :areaId)",
           nativeQuery = true)
    long countNonArchivedByArea(@Param("areaId") Integer areaId);

    @Query(value = "SELECT COUNT(*) FROM postal_offices " +
                   "WHERE office_status = 'OPEN' " +
                   "AND id NOT IN (SELECT postal_office_id FROM archived_offices)",
           nativeQuery = true)
    long countOpenOffices();

    @Query(value = "SELECT COUNT(*) FROM postal_offices " +
                   "WHERE office_status = 'CLOSED' " +
                   "AND id NOT IN (SELECT postal_office_id FROM archived_offices)",
           nativeQuery = true)
    long countClosedOffices();
}