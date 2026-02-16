package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.Area;
import com.pps.profilesystem.Repository.AreaRepository;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
/**
 * Controller for Quarters Management Page
 * Displays connectivity status across quarters using historical connectivity data
 * Shows actual connection/disconnection counts for each quarter based on connectivity records
 */
@Controller
@RequestMapping("/quarters")
public class QuartersController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private AreaRepository areaRepository;

    @GetMapping
    public String showQuartersPage(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String areaFilter,
            @RequestParam(required = false) String quarterFilter,
            @RequestParam(required = false) String statusFilter,
            Model model) {

        int currentYear = (year != null) ? year : LocalDate.now().getYear();

        model.addAttribute("currentYear", currentYear);
        model.addAttribute("currentQuarterInfo", getCurrentQuarterInfo());
        model.addAttribute("connectivityStats", getConnectivityStats());
        model.addAttribute("areas", getAreas());
        model.addAttribute("quartersData", getQuartersData(currentYear));
        model.addAttribute("selectedAreaFilter", areaFilter);
        model.addAttribute("selectedQuarterFilter", quarterFilter);
        model.addAttribute("selectedStatusFilter", statusFilter);

        model.addAttribute("activePage", "quarters");

        Map<String, Boolean> userAccess = new HashMap<>();
        userAccess.put("can_access_all_areas", true);
        model.addAttribute("userAccess", userAccess);

        return "quarters";
    }

    /**
     * Get current quarter information
     */
    private Map<String, Object> getCurrentQuarterInfo() {
        Map<String, Object> info = new HashMap<>();
        LocalDate now = LocalDate.now();
        int month = now.getMonthValue();
        
        String quarter;
        String monthName = now.getMonth().toString();
        long daysUntilNext;
        
        if (month >= 1 && month <= 3) {
            quarter = "Q1";
            daysUntilNext = LocalDate.of(now.getYear(), 4, 1).toEpochDay() - now.toEpochDay();
        } else if (month >= 4 && month <= 6) {
            quarter = "Q2";
            daysUntilNext = LocalDate.of(now.getYear(), 7, 1).toEpochDay() - now.toEpochDay();
        } else if (month >= 7 && month <= 9) {
            quarter = "Q3";
            daysUntilNext = LocalDate.of(now.getYear(), 10, 1).toEpochDay() - now.toEpochDay();
        } else {
            quarter = "Q4";
            daysUntilNext = LocalDate.of(now.getYear() + 1, 1, 1).toEpochDay() - now.toEpochDay();
        }
        
        info.put("quarter", quarter);
        info.put("monthName", monthName);
        info.put("daysUntilNext", daysUntilNext);
        
        return info;
    }

    /**
     * Get connectivity statistics
     */
    private Map<String, Long> getConnectivityStats() {
        Map<String, Long> stats = new HashMap<>();
        
        try {
            long totalConnected = postalOfficeRepository.countByConnectionStatus(true);
            long totalDisconnected = postalOfficeRepository.countByConnectionStatus(false);
            long totalOffices = postalOfficeRepository.count();
            
            stats.put("totalConnected", totalConnected);
            stats.put("totalDisconnected", totalDisconnected);
            stats.put("totalOffices", totalOffices);
        } catch (Exception e) {
            // Handle database connection issues gracefully
            stats.put("totalConnected", 0L);
            stats.put("totalDisconnected", 0L);
            stats.put("totalOffices", 0L);
        }
        
        return stats;
    }

    /**
     * Get list of Area objects
     */
    private List<Area> getAreas() {
        try {
            return areaRepository.findAll();
        } catch (Exception e) {
            // Handle database connection issues gracefully
            return new ArrayList<>();
        }
    }

    /**
     * Get quarters data for a specific year
     * Now uses historical connectivity data to show actual counts per quarter
     */
    private List<Map<String, Object>> getQuartersData(int year) {
        List<Map<String, Object>> quartersData = new ArrayList<>();
        
        try {
            String[] quarters = {"Q1", "Q2", "Q3", "Q4"};
            LocalDate now = LocalDate.now();
            int currentQuarter = (now.getMonthValue() - 1) / 3;
            
            // Quarter month ranges
            int[][] quarterMonths = {
                {1, 3},   // Q1: Jan-Mar
                {4, 6},   // Q2: Apr-Jun
                {7, 9},   // Q3: Jul-Sep
                {10, 12}  // Q4: Oct-Dec
            };
            
            for (int i = 0; i < quarters.length; i++) {
                Map<String, Object> quarterData = new HashMap<>();
                
                quarterData.put("quarter", quarters[i]);
                quarterData.put("year", year);
                
                // Get historical connection counts for this quarter
                int startMonth = quarterMonths[i][0];
                int endMonth = quarterMonths[i][1];
                
                // Count new connections in this quarter
                long newlyConnected = postalOfficeRepository.countConnectedInQuarter(year, startMonth, endMonth);
                
                // Count new disconnections in this quarter
                long newlyDisconnected = postalOfficeRepository.countDisconnectedInQuarter(year, startMonth, endMonth);
                
                // Calculate totals as of the end of this quarter
                LocalDateTime quarterEnd = LocalDateTime.of(year, endMonth, getLastDayOfMonth(year, endMonth), 23, 59, 59);
                long totalConnected = postalOfficeRepository.countActiveAtQuarterEnd(quarterEnd);
                long totalDisconnected = postalOfficeRepository.count() - totalConnected;
                
                quarterData.put("connected", totalConnected);
                quarterData.put("disconnected", totalDisconnected);
                quarterData.put("newlyConnected", newlyConnected);
                quarterData.put("newlyDisconnected", newlyDisconnected);
                
                // Mark current quarter
                quarterData.put("isCurrent", year == now.getYear() && i == currentQuarter);
                
                quartersData.add(quarterData);
            }
        } catch (Exception e) {
            // Handle database connection issues gracefully - return empty quarters data
            String[] quarters = {"Q1", "Q2", "Q3", "Q4"};
            LocalDate now = LocalDate.now();
            int currentQuarter = (now.getMonthValue() - 1) / 3;
            
            for (int i = 0; i < quarters.length; i++) {
                Map<String, Object> quarterData = new HashMap<>();
                quarterData.put("quarter", quarters[i]);
                quarterData.put("year", year);
                quarterData.put("connected", 0L);
                quarterData.put("disconnected", 0L);
                quarterData.put("newlyConnected", 0L);
                quarterData.put("newlyDisconnected", 0L);
                quarterData.put("isCurrent", year == now.getYear() && i == currentQuarter);
                quartersData.add(quarterData);
            }
        }
        
        return quartersData;
    }
    
    /**
     * Helper method to get the last day of a month
     */
    private int getLastDayOfMonth(int year, int month) {
        return java.time.YearMonth.of(year, month).lengthOfMonth();
    }
}  