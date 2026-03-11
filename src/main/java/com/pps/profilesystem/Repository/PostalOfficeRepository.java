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

    // FIX N+1: Fetch all non-archived offices WITH all required relationships in a single JOIN query
    // DISTINCT prevents duplicate rows when offices have multiple connectivity records
    @Query("SELECT DISTINCT po FROM PostalOffice po LEFT JOIN FETCH po.activeConnectivity LEFT JOIN FETCH po.area LEFT JOIN FETCH po.cityMunicipality LEFT JOIN FETCH po.cityMunicipality.province LEFT JOIN FETCH po.cityMunicipality.province.regions WHERE po.isArchived = false")
    List<PostalOffice> findAllNonArchivedWithConnectivity();

    List<PostalOffice> findByIsArchivedTrue();

    long countByIsArchivedTrue();

    long countByIsArchivedFalse();

    long countByConnectionStatusAndIsArchivedFalse(Boolean status);

    @Query("SELECT COUNT(DISTINCT po.area.id) FROM PostalOffice po WHERE po.area IS NOT NULL AND po.isArchived = false")
    long countDistinctAreasNonArchived();

    @Query("SELECT po FROM PostalOffice po LEFT JOIN FETCH po.area WHERE po.latitude IS NOT NULL AND po.longitude IS NOT NULL AND po.isArchived = false")
    List<PostalOffice> findAllWithAreaForMapNonArchived();

    // Dedup Layer 2: match by exact longitude + latitude
    @Query("SELECT po FROM PostalOffice po WHERE po.longitude = :longitude AND po.latitude = :latitude")
    List<PostalOffice> findByLongitudeAndLatitude(@Param("longitude") Double longitude, @Param("latitude") Double latitude);

    // Dedup Layer 3: match by zip code (fallback when name is blank and coords differ)
    List<PostalOffice> findByZipCode(String zipCode);
}