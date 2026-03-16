package com.pps.profilesystem.Repository;

import com.pps.profilesystem.Entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PostalOfficeRepository extends JpaRepository<PostalOffice, Integer> {

    List<PostalOffice> findByConnectionStatus(Boolean status);

    List<PostalOffice> findByNameContainingIgnoreCase(String name);

    List<PostalOffice> findByCityMunicipalityId(Integer cityMunId);

    long countByConnectionStatus(Boolean status);

    @Query("SELECT COUNT(DISTINCT po.area.id) FROM PostalOffice po WHERE po.area IS NOT NULL")
    long countDistinctAreas();

    @Query("SELECT po FROM PostalOffice po LEFT JOIN FETCH po.area WHERE po.latitude IS NOT NULL AND po.longitude IS NOT NULL")
    List<PostalOffice> findAllWithAreaForMap();

    @Query("SELECT COUNT(DISTINCT c.postalOffice) FROM Connectivity c WHERE " +
           "YEAR(c.dateConnected) = :year AND " +
           "MONTH(c.dateConnected) BETWEEN :startMonth AND :endMonth")
    long countConnectedInQuarter(@Param("year") int year, @Param("startMonth") int startMonth, @Param("endMonth") int endMonth);

    @Query("SELECT COUNT(DISTINCT c.postalOffice) FROM Connectivity c WHERE " +
           "YEAR(c.dateDisconnected) = :year AND " +
           "MONTH(c.dateDisconnected) BETWEEN :startMonth AND :endMonth")
    long countDisconnectedInQuarter(@Param("year") int year, @Param("startMonth") int startMonth, @Param("endMonth") int endMonth);

    @Query("SELECT COUNT(DISTINCT c.postalOffice) FROM Connectivity c WHERE " +
           "c.dateConnected <= :quarterEnd AND " +
           "(c.dateDisconnected IS NULL OR c.dateDisconnected > :quarterEnd)")
    long countActiveAtQuarterEnd(@Param("quarterEnd") LocalDateTime quarterEnd);

    @Query("SELECT DISTINCT po FROM PostalOffice po " +
           "JOIN Connectivity c ON po.id = c.postalOffice.id " +
           "WHERE c.dateConnected BETWEEN :startDate AND :endDate")
    List<PostalOffice> findByDateConnectedBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    @Query("SELECT DISTINCT po FROM PostalOffice po " +
           "JOIN Connectivity c ON po.id = c.postalOffice.id " +
           "WHERE c.dateDisconnected BETWEEN :startDate AND :endDate")
    List<PostalOffice> findByDateDisconnectedBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    List<PostalOffice> findByIsArchivedFalse();

    // Fetch all non-archived offices with all required relationships
    @Query("SELECT DISTINCT po FROM PostalOffice po " +
           "LEFT JOIN FETCH po.activeConnectivity " +
           "LEFT JOIN FETCH po.area " +
           "LEFT JOIN FETCH po.cityMunicipality " +
           "LEFT JOIN FETCH po.cityMunicipality.province " +
           "LEFT JOIN FETCH po.cityMunicipality.province.regions " +
           "WHERE po.isArchived = false")
    List<PostalOffice> findAllNonArchivedWithConnectivity();

    // ✅ NEW: Fetch non-archived offices filtered by area_id (for Area Admin / User)
    @Query("SELECT DISTINCT po FROM PostalOffice po " +
           "LEFT JOIN FETCH po.activeConnectivity " +
           "LEFT JOIN FETCH po.area " +
           "LEFT JOIN FETCH po.cityMunicipality " +
           "LEFT JOIN FETCH po.cityMunicipality.province " +
           "LEFT JOIN FETCH po.cityMunicipality.province.regions " +
           "WHERE po.isArchived = false AND po.area.id = :areaId")
    List<PostalOffice> findAllNonArchivedByArea(@Param("areaId") Integer areaId);

    List<PostalOffice> findByIsArchivedTrue();

    long countByIsArchivedTrue();

    long countByIsArchivedFalse();

    long countByConnectionStatusAndIsArchivedFalse(Boolean status);

    @Query("SELECT COUNT(DISTINCT po.area.id) FROM PostalOffice po WHERE po.area IS NOT NULL AND po.isArchived = false")
    long countDistinctAreasNonArchived();

    @Query("SELECT po FROM PostalOffice po LEFT JOIN FETCH po.area " +
           "WHERE po.latitude IS NOT NULL AND po.longitude IS NOT NULL AND po.isArchived = false")
    List<PostalOffice> findAllWithAreaForMapNonArchived();

    @Query("SELECT po FROM PostalOffice po WHERE po.longitude = :longitude AND po.latitude = :latitude")
    List<PostalOffice> findByLongitudeAndLatitude(@Param("longitude") Double longitude, @Param("latitude") Double latitude);

    List<PostalOffice> findByZipCode(String zipCode);

    @Query("SELECT COUNT(DISTINCT c.postalOffice) FROM Connectivity c " +
           "WHERE c.dateConnected <= :refDate " +
           "AND (c.dateDisconnected IS NULL OR c.dateDisconnected > :refDate) " +
           "AND c.postalOffice.isArchived = false " +
           "AND (:areaId IS NULL OR c.postalOffice.area.id = :areaId)")
    long countActiveAtYearEndByArea(@Param("refDate") LocalDateTime refDate,
                                    @Param("areaId") Integer areaId);

    @Query("SELECT COUNT(po) FROM PostalOffice po " +
           "WHERE po.isArchived = false " +
           "AND (:areaId IS NULL OR po.area.id = :areaId)")
    long countByIsArchivedFalseAndArea(@Param("areaId") Integer areaId);
}