package com.pps.profilesystem.Repository;

import com.pps.profilesystem.Entity.ConnectivityHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConnectivityHistoryRepository extends JpaRepository<ConnectivityHistory, Integer> {

    /**
     * Find all snapshots for a specific quarter and year
     */
    List<ConnectivityHistory> findByYearAndQuarter(Integer year, Integer quarter);

    /**
     * Find snapshot for a specific office in a specific quarter
     */
    Optional<ConnectivityHistory> findByPostalOfficeIdAndYearAndQuarter(
        Integer officeId, Integer year, Integer quarter);

    /**
     * Check if snapshot exists for a specific quarter
     */
    boolean existsByYearAndQuarter(Integer year, Integer quarter);

    /**
     * Count connected offices in a specific quarter
     */
    @Query("SELECT COUNT(ch) FROM ConnectivityHistory ch " +
           "WHERE ch.year = :year AND ch.quarter = :quarter AND ch.wasConnected = true")
    long countConnectedByYearAndQuarter(@Param("year") Integer year, @Param("quarter") Integer quarter);

    /**
     * Count disconnected offices in a specific quarter
     */
    @Query("SELECT COUNT(ch) FROM ConnectivityHistory ch " +
           "WHERE ch.year = :year AND ch.quarter = :quarter AND ch.wasConnected = false")
    long countDisconnectedByYearAndQuarter(@Param("year") Integer year, @Param("quarter") Integer quarter);

    /**
     * Get all quarters that have snapshots
     */
    @Query("SELECT DISTINCT ch.year FROM ConnectivityHistory ch ORDER BY ch.year DESC")
    List<Integer> findDistinctYears();

    /**
     * Delete all snapshots for a specific quarter (for re-snapshotting)
     */
    void deleteByYearAndQuarter(Integer year, Integer quarter);
}