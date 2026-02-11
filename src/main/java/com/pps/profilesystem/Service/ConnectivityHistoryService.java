package com.pps.profilesystem.Service;

import com.pps.profilesystem.Entity.ConnectivityHistory;
import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Repository.ConnectivityHistoryRepository;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service for managing quarterly connectivity snapshots
 * Tracks changes in connectivity status over time
 */
@Service
@Transactional
public class ConnectivityHistoryService {

    @Autowired
    private ConnectivityHistoryRepository historyRepository;

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    /**
     * Create a snapshot of current connectivity status for the current quarter
     */
    public Map<String, Object> createCurrentQuarterSnapshot() {
        LocalDate now = LocalDate.now();
        int year = now.getYear();
        int quarter = getQuarterFromMonth(now.getMonthValue());

        return createQuarterSnapshot(year, quarter);
    }

    /**
     * Create a snapshot for a specific quarter
     */
    public Map<String, Object> createQuarterSnapshot(int year, int quarter) {
        Map<String, Object> result = new HashMap<>();

        // Check if snapshot already exists
        boolean exists = historyRepository.existsByYearAndQuarter(year, quarter);
        if (exists) {
            result.put("success", false);
            result.put("message", "Snapshot already exists for Q" + quarter + " " + year);
            result.put("year", year);
            result.put("quarter", quarter);
            return result;
        }

        // Get all postal offices
        List<PostalOffice> allOffices = postalOfficeRepository.findAll();

        // Create snapshot records
        List<ConnectivityHistory> snapshots = new ArrayList<>();
        int connectedCount = 0;
        int disconnectedCount = 0;

        for (PostalOffice office : allOffices) {
            ConnectivityHistory history = new ConnectivityHistory();
            history.setPostalOffice(office);
            history.setYear(year);
            history.setQuarter(quarter);
            history.setWasConnected(office.getConnectionStatus() != null ? office.getConnectionStatus() : false);
            history.setSnapshotDate(LocalDateTime.now());

            snapshots.add(history);

            if (history.getWasConnected()) {
                connectedCount++;
            } else {
                disconnectedCount++;
            }
        }

        // Save all snapshots
        historyRepository.saveAll(snapshots);

        result.put("success", true);
        result.put("message", "Snapshot created successfully for Q" + quarter + " " + year);
        result.put("year", year);
        result.put("quarter", quarter);
        result.put("totalOffices", allOffices.size());
        result.put("connected", connectedCount);
        result.put("disconnected", disconnectedCount);

        return result;
    }

    /**
     * Get quarterly statistics with change detection
     */
    public Map<String, Object> getQuarterlyStatistics(int year, int quarter) {
        Map<String, Object> stats = new HashMap<>();

        // Current quarter snapshot
        List<ConnectivityHistory> currentSnapshot = historyRepository.findByYearAndQuarter(year, quarter);

        if (currentSnapshot.isEmpty()) {
            stats.put("hasData", false);
            stats.put("message", "No snapshot available for Q" + quarter + " " + year);
            return stats;
        }

        // Previous quarter
        int prevYear = year;
        int prevQuarter = quarter - 1;
        if (prevQuarter == 0) {
            prevQuarter = 4;
            prevYear = year - 1;
        }

        List<ConnectivityHistory> previousSnapshot = historyRepository.findByYearAndQuarter(prevYear, prevQuarter);

        // Calculate statistics
        long currentConnected = currentSnapshot.stream().filter(ConnectivityHistory::getWasConnected).count();
        long currentDisconnected = currentSnapshot.size() - currentConnected;

        stats.put("hasData", true);
        stats.put("year", year);
        stats.put("quarter", quarter);
        stats.put("totalOffices", currentSnapshot.size());
        stats.put("connected", currentConnected);
        stats.put("disconnected", currentDisconnected);

        // Calculate changes if previous quarter exists
        if (!previousSnapshot.isEmpty()) {
            Map<Integer, Boolean> previousStatus = new HashMap<>();
            for (ConnectivityHistory prev : previousSnapshot) {
                previousStatus.put(prev.getPostalOffice().getId(), prev.getWasConnected());
            }

            int newlyConnected = 0;
            int newlyDisconnected = 0;

            for (ConnectivityHistory current : currentSnapshot) {
                Integer officeId = current.getPostalOffice().getId();
                Boolean wasConnectedBefore = previousStatus.get(officeId);

                if (wasConnectedBefore != null) {
                    // Office existed in previous quarter
                    if (current.getWasConnected() && !wasConnectedBefore) {
                        newlyConnected++;
                    } else if (!current.getWasConnected() && wasConnectedBefore) {
                        newlyDisconnected++;
                    }
                } else {
                    // New office added this quarter
                    if (current.getWasConnected()) {
                        newlyConnected++;
                    }
                }
            }

            stats.put("hasPreviousData", true);
            stats.put("previousYear", prevYear);
            stats.put("previousQuarter", prevQuarter);
            stats.put("newlyConnected", newlyConnected);
            stats.put("newlyDisconnected", newlyDisconnected);
        } else {
            stats.put("hasPreviousData", false);
            stats.put("newlyConnected", 0);
            stats.put("newlyDisconnected", 0);
        }

        return stats;
    }

    /**
     * Get all available quarters with snapshots
     */
    public List<Map<String, Object>> getAllAvailableQuarters() {
        List<Integer> years = historyRepository.findDistinctYears();
        List<Map<String, Object>> quarters = new ArrayList<>();

        for (Integer year : years) {
            for (int quarter = 1; quarter <= 4; quarter++) {
                if (historyRepository.existsByYearAndQuarter(year, quarter)) {
                    Map<String, Object> quarterInfo = new HashMap<>();
                    quarterInfo.put("year", year);
                    quarterInfo.put("quarter", quarter);
                    quarterInfo.put("label", "Q" + quarter + " " + year);

                    long connected = historyRepository.countConnectedByYearAndQuarter(year, quarter);
                    long disconnected = historyRepository.countDisconnectedByYearAndQuarter(year, quarter);

                    quarterInfo.put("connected", connected);
                    quarterInfo.put("disconnected", disconnected);
                    quarterInfo.put("total", connected + disconnected);

                    quarters.add(quarterInfo);
                }
            }
        }

        return quarters;
    }

    /**
     * Delete and recreate snapshot for a specific quarter
     */
    @Transactional
    public Map<String, Object> recreateQuarterSnapshot(int year, int quarter) {
        // Delete existing snapshot
        historyRepository.deleteByYearAndQuarter(year, quarter);

        // Create new snapshot
        return createQuarterSnapshot(year, quarter);
    }

    /**
     * Get current quarter number from month (1-12)
     */
    private int getQuarterFromMonth(int month) {
        return (month - 1) / 3 + 1;
    }

    /**
     * Delete snapshot for a specific quarter
     */
    @Transactional
    public Map<String, Object> deleteQuarterSnapshot(int year, int quarter) {
        Map<String, Object> result = new HashMap<>();
        
        // Check if snapshot exists
        boolean exists = historyRepository.existsByYearAndQuarter(year, quarter);
        if (!exists) {
            result.put("success", false);
            result.put("message", "No snapshot exists for Q" + quarter + " " + year);
            return result;
        }
        
        // Get count before deletion
        long connectedCount = historyRepository.countConnectedByYearAndQuarter(year, quarter);
        long disconnectedCount = historyRepository.countDisconnectedByYearAndQuarter(year, quarter);
        long totalCount = connectedCount + disconnectedCount;
        
        // Delete the snapshot
        historyRepository.deleteByYearAndQuarter(year, quarter);
        
        result.put("success", true);
        result.put("message", "Snapshot deleted successfully for Q" + quarter + " " + year);
        result.put("year", year);
        result.put("quarter", quarter);
        result.put("totalOffices", totalCount);
        result.put("connected", connectedCount);
        result.put("disconnected", disconnectedCount);
        
        return result;
    }

    /**
     * Get the current quarter info
     */
    public Map<String, Object> getCurrentQuarterInfo() {
        LocalDate now = LocalDate.now();
        int year = now.getYear();
        int quarter = getQuarterFromMonth(now.getMonthValue());

        Map<String, Object> info = new HashMap<>();
        info.put("year", year);
        info.put("quarter", quarter);
        info.put("month", now.getMonthValue());
        info.put("monthName", now.getMonth().toString());
        info.put("hasSnapshot", historyRepository.existsByYearAndQuarter(year, quarter));

        return info;
    }
}