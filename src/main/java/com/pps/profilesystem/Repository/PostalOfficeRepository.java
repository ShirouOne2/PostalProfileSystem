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
    
    // Find offices by their connection status (True/False)
    List<PostalOffice> findByConnectionStatus(Boolean status);
    
    // Search for an office by name (case-insensitive)
    List<PostalOffice> findByNameContainingIgnoreCase(String name);
    
    // Find all offices within a specific City/Municipality
    List<PostalOffice> findByCityMunicipalityId(Integer cityMunId);

    long countByConnectionStatus(Boolean status);

    @Query("SELECT COUNT(DISTINCT po.area.id) FROM PostalOffice po WHERE po.area IS NOT NULL")
    long countDistinctAreas();
    
    // NEW: Custom query that eagerly fetches Area for map display
    @Query("SELECT po FROM PostalOffice po LEFT JOIN FETCH po.area WHERE po.latitude IS NOT NULL AND po.longitude IS NOT NULL")
    List<PostalOffice> findAllWithAreaForMap();
    
    // Count offices that were connected in a specific quarter and year
    @Query("SELECT COUNT(DISTINCT c.postalOffice) FROM Connectivity c WHERE " +
           "YEAR(c.dateConnected) = :year AND " +
           "MONTH(c.dateConnected) BETWEEN :startMonth AND :endMonth")
    long countConnectedInQuarter(@Param("year") int year, @Param("startMonth") int startMonth, @Param("endMonth") int endMonth);
    
    // Count offices that were disconnected in a specific quarter and year
    @Query("SELECT COUNT(DISTINCT c.postalOffice) FROM Connectivity c WHERE " +
           "YEAR(c.dateDisconnected) = :year AND " +
           "MONTH(c.dateDisconnected) BETWEEN :startMonth AND :endMonth")
    long countDisconnectedInQuarter(@Param("year") int year, @Param("startMonth") int startMonth, @Param("endMonth") int endMonth);
    
    // Count offices with active connections as of the end of a quarter
    @Query("SELECT COUNT(DISTINCT c.postalOffice) FROM Connectivity c WHERE " +
           "c.dateConnected <= :quarterEnd AND " +
           "(c.dateDisconnected IS NULL OR c.dateDisconnected > :quarterEnd)")
    long countActiveAtQuarterEnd(@Param("quarterEnd") LocalDateTime quarterEnd);
}