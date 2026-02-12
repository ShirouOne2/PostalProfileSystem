package com.pps.profilesystem.Service;

import com.pps.profilesystem.Entity.Connectivity;
import com.pps.profilesystem.Repository.ConnectivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Month;
import java.util.*;

/**
 * Service for tracking connectivity changes by quarter
 * Uses date_connected and date_disconnected to track when offices go active/inactive
 */
@Service
public class QuarterConnectivityService {

    @Autowired
    private ConnectivityRepository connectivityRepository;

    /**
     * Get connectivity statistics for a specific quarter
     */
    @Transactional(readOnly = true)
    public QuarterStats getQuarterStats(int year, int quarter) {
        LocalDateTime[] quarterDates = getQuarterDateRange(year, quarter);
        LocalDateTime quarterStart = quarterDates[0];
        LocalDateTime quarterEnd = quarterDates[1];

        QuarterStats stats = new QuarterStats();
        stats.setYear(year);
        stats.setQuarter(quarter);

        // Count newly connected in this quarter
        Long newlyConnected = connectivityRepository.countNewlyConnectedInQuarter(quarterStart, quarterEnd);
        stats.setNewlyConnected(newlyConnected != null ? newlyConnected.intValue() : 0);

        // Count newly disconnected in this quarter
        Long newlyDisconnected = connectivityRepository.countNewlyDisconnectedInQuarter(quarterStart, quarterEnd);
        stats.setNewlyDisconnected(newlyDisconnected != null ? newlyDisconnected.intValue() : 0);

        // Count total active at end of quarter
        List<Connectivity> activeAtQuarterEnd = connectivityRepository.findActiveAtDate(quarterEnd);
        stats.setTotalConnected(activeAtQuarterEnd.size());

        // Count total inactive (all connectivity records that are disconnected)
        List<Connectivity> allInactive = connectivityRepository.findAllInactive();
        stats.setTotalDisconnected(allInactive.size());

        return stats;
    }

    /**
     * Get connectivity statistics for all quarters in a year
     */
    @Transactional(readOnly = true)
    public List<QuarterStats> getYearStats(int year) {
        List<QuarterStats> yearStats = new ArrayList<>();
        for (int quarter = 1; quarter <= 4; quarter++) {
            yearStats.add(getQuarterStats(year, quarter));
        }
        return yearStats;
    }

    /**
     * Get all offices that connected in a specific quarter
     */
    @Transactional(readOnly = true)
    public List<Connectivity> getNewlyConnectedInQuarter(int year, int quarter) {
        return connectivityRepository.findConnectionsInQuarter(year, quarter);
    }

    /**
     * Get all offices that disconnected in a specific quarter
     */
    @Transactional(readOnly = true)
    public List<Connectivity> getNewlyDisconnectedInQuarter(int year, int quarter) {
        return connectivityRepository.findDisconnectionsInQuarter(year, quarter);
    }

    /**
     * Mark a connection as disconnected
     */
    @Transactional
    public void disconnectOffice(Integer connectivityId) {
        Optional<Connectivity> connOpt = connectivityRepository.findById(connectivityId);
        if (connOpt.isPresent()) {
            Connectivity conn = connOpt.get();
            conn.disconnect(); // Uses the helper method
            connectivityRepository.save(conn);
        }
    }

    /**
     * Create a new connection for an office
     */
    @Transactional
    public Connectivity connectOffice(Connectivity connectivity) {
        // Date is automatically set in @PrePersist
        return connectivityRepository.save(connectivity);
    }

    /**
     * Get the date range for a specific quarter
     * Returns [startDate, endDate]
     */
    private LocalDateTime[] getQuarterDateRange(int year, int quarter) {
        Month startMonth;
        Month endMonth;

        switch (quarter) {
            case 1:
                startMonth = Month.JANUARY;
                endMonth = Month.MARCH;
                break;
            case 2:
                startMonth = Month.APRIL;
                endMonth = Month.JUNE;
                break;
            case 3:
                startMonth = Month.JULY;
                endMonth = Month.SEPTEMBER;
                break;
            case 4:
                startMonth = Month.OCTOBER;
                endMonth = Month.DECEMBER;
                break;
            default:
                throw new IllegalArgumentException("Quarter must be 1-4");
        }

        LocalDateTime start = LocalDateTime.of(year, startMonth, 1, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(year, endMonth, endMonth.length(isLeapYear(year)), 23, 59, 59);

        return new LocalDateTime[]{start, end};
    }

    private boolean isLeapYear(int year) {
        return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    }

    /**
     * DTO for quarter statistics
     */
    public static class QuarterStats {
        private int year;
        private int quarter;
        private int newlyConnected;
        private int newlyDisconnected;
        private int totalConnected;
        private int totalDisconnected;

        // Getters and Setters
        public int getYear() {
            return year;
        }

        public void setYear(int year) {
            this.year = year;
        }

        public int getQuarter() {
            return quarter;
        }

        public void setQuarter(int quarter) {
            this.quarter = quarter;
        }

        public int getNewlyConnected() {
            return newlyConnected;
        }

        public void setNewlyConnected(int newlyConnected) {
            this.newlyConnected = newlyConnected;
        }

        public int getNewlyDisconnected() {
            return newlyDisconnected;
        }

        public void setNewlyDisconnected(int newlyDisconnected) {
            this.newlyDisconnected = newlyDisconnected;
        }

        public int getTotalConnected() {
            return totalConnected;
        }

        public void setTotalConnected(int totalConnected) {
            this.totalConnected = totalConnected;
        }

        public int getTotalDisconnected() {
            return totalDisconnected;
        }

        public void setTotalDisconnected(int totalDisconnected) {
            this.totalDisconnected = totalDisconnected;
        }

        public String getQuarterLabel() {
            return "Q" + quarter + " " + year;
        }
    }
}