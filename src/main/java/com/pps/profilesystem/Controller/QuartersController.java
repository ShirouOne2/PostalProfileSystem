package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.Area;
import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.AreaRepository;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Service.PostalOfficeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

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

    @Autowired
    private PostalOfficeService postalOfficeService;

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
        model.addAttribute("quartersData", getQuartersData(currentYear, statusFilter, quarterFilter, areaFilter));
        model.addAttribute("selectedAreaFilter", areaFilter);
        model.addAttribute("selectedQuarterFilter", quarterFilter);
        model.addAttribute("selectedStatusFilter", statusFilter);

        model.addAttribute("activePage", "quarters");

        // Add user access information
        model.addAttribute("userAccess", postalOfficeService.getCurrentUserInfo());
        
        // Add current user information for header
        User currentUser = postalOfficeService.getCurrentUser();
        if (currentUser != null) {
            model.addAttribute("user", currentUser);
            model.addAttribute("roleName", getRoleName(currentUser.getRole()));
            model.addAttribute("roleColor", getRoleColor(currentUser.getRole()));
        }

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
     * Get connectivity statistics (non-archived only)
     * Filtered by user's area if not admin
     */
    private Map<String, Long> getConnectivityStats() {
        Map<String, Long> stats = new HashMap<>();
        
        try {
            Integer userAreaId = getCurrentUserAreaId();
            
            if (userAreaId == null) {
                // Admin - get all statistics
                long totalConnected = postalOfficeRepository.countByConnectionStatusAndIsArchivedFalse(true);
                long totalDisconnected = postalOfficeRepository.countByConnectionStatusAndIsArchivedFalse(false);
                long totalOffices = postalOfficeRepository.count() - postalOfficeRepository.countByIsArchivedTrue();
                
                stats.put("totalConnected", totalConnected);
                stats.put("totalDisconnected", totalDisconnected);
                stats.put("totalOffices", totalOffices);
            } else {
                // Non-admin user - filter by their area
                long totalConnected = postalOfficeRepository.findByIsArchivedFalse().stream()
                    .filter(office -> office.getArea() != null && office.getArea().getId().equals(userAreaId))
                    .filter(office -> Boolean.TRUE.equals(office.getConnectionStatus()))
                    .count();
                    
                long totalDisconnected = postalOfficeRepository.findByIsArchivedFalse().stream()
                    .filter(office -> office.getArea() != null && office.getArea().getId().equals(userAreaId))
                    .filter(office -> !Boolean.TRUE.equals(office.getConnectionStatus()))
                    .count();
                    
                long totalOffices = totalConnected + totalDisconnected;
                
                stats.put("totalConnected", totalConnected);
                stats.put("totalDisconnected", totalDisconnected);
                stats.put("totalOffices", totalOffices);
            }
        } catch (Exception e) {
            // Handle database connection issues gracefully
            stats.put("totalConnected", 0L);
            stats.put("totalDisconnected", 0L);
            stats.put("totalOffices", 0L);
        }
        
        return stats;
    }

    /**
     * Get list of Area objects (filtered by user's area if not admin)
     */
    private List<Area> getAreas() {
        try {
            Integer userAreaId = getCurrentUserAreaId();
            if (userAreaId == null) {
                // Admin - show all areas
                return areaRepository.findAll();
            } else {
                // Non-admin user - show only their assigned area
                return areaRepository.findAll().stream()
                    .filter(area -> area.getId().equals(userAreaId))
                    .collect(Collectors.toList());
            }
        } catch (Exception e) {
            // Handle database connection issues gracefully
            return new ArrayList<>();
        }
    }

    /**
     * Get quarters data for a specific year with optional filters
     * Now uses historical connectivity data to show actual counts per quarter
     * Filtered by user's area if not admin
     */
    private List<Map<String, Object>> getQuartersData(int year, String statusFilter, String quarterFilter, String areaFilter) {
        List<Map<String, Object>> quartersData = new ArrayList<>();
        
        try {
            Integer userAreaId = getCurrentUserAreaId();
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
                // Skip if quarter filter is set and doesn't match current quarter
                if (quarterFilter != null && !quarterFilter.isEmpty() && !quarters[i].equals(quarterFilter)) {
                    continue;
                }
                
                Map<String, Object> quarterData = new HashMap<>();
                
                quarterData.put("quarter", quarters[i]);
                quarterData.put("year", year);
                
                // Get historical connection counts for this quarter
                int startMonth = quarterMonths[i][0];
                int endMonth = quarterMonths[i][1];
                
                long newlyConnected, newlyDisconnected, totalConnected, totalDisconnected;
                
                if (userAreaId == null) {
                    // Admin - get all data
                    newlyConnected = postalOfficeRepository.countConnectedInQuarter(year, startMonth, endMonth);
                    newlyDisconnected = postalOfficeRepository.countDisconnectedInQuarter(year, startMonth, endMonth);
                    
                    LocalDateTime quarterEnd = LocalDateTime.of(year, endMonth, getLastDayOfMonth(year, endMonth), 23, 59, 59);
                    totalConnected = postalOfficeRepository.countActiveAtQuarterEndNonArchived(quarterEnd);
                    totalDisconnected = (postalOfficeRepository.count() - postalOfficeRepository.countByIsArchivedTrue()) - totalConnected;
                } else {
                    // Non-admin user - filter by their area
                    // For area-filtered quarterly data, we need to manually filter since repository methods don't support area filtering
                    newlyConnected = postalOfficeRepository.findByIsArchivedFalse().stream()
                        .filter(office -> office.getArea() != null && office.getArea().getId().equals(userAreaId))
                        .filter(office -> office.getActiveConnectivity() != null && 
                                       office.getActiveConnectivity().getDateConnected() != null)
                        .filter(office -> {
                            LocalDateTime dateConnected = office.getActiveConnectivity().getDateConnected();
                            return dateConnected.getYear() == year && 
                                   dateConnected.getMonthValue() >= startMonth && 
                                   dateConnected.getMonthValue() <= endMonth;
                        })
                        .count();
                    
                    newlyDisconnected = postalOfficeRepository.findByIsArchivedFalse().stream()
                        .filter(office -> office.getArea() != null && office.getArea().getId().equals(userAreaId))
                        .filter(office -> office.getActiveConnectivity() != null && 
                                       office.getActiveConnectivity().getDateDisconnected() != null)
                        .filter(office -> {
                            LocalDateTime dateDisconnected = office.getActiveConnectivity().getDateDisconnected();
                            return dateDisconnected.getYear() == year && 
                                   dateDisconnected.getMonthValue() >= startMonth && 
                                   dateDisconnected.getMonthValue() <= endMonth;
                        })
                        .count();
                    
                    totalConnected = postalOfficeRepository.findByIsArchivedFalse().stream()
                        .filter(office -> office.getArea() != null && office.getArea().getId().equals(userAreaId))
                        .filter(office -> Boolean.TRUE.equals(office.getConnectionStatus()))
                        .count();
                    
                    totalDisconnected = postalOfficeRepository.findByIsArchivedFalse().stream()
                        .filter(office -> office.getArea() != null && office.getArea().getId().equals(userAreaId))
                        .filter(office -> !Boolean.TRUE.equals(office.getConnectionStatus()))
                        .count();
                }
                
                // Apply status filter logic
                if ("newly_connected".equals(statusFilter)) {
                    // For newly connected filter, only show the newly connected count
                    quarterData.put("connected", newlyConnected);
                    quarterData.put("disconnected", 0L);
                    quarterData.put("newlyConnected", newlyConnected);
                    quarterData.put("newlyDisconnected", 0L);
                } else if ("newly_disconnected".equals(statusFilter)) {
                    // For newly disconnected filter, only show the newly disconnected count
                    quarterData.put("connected", 0L);
                    quarterData.put("disconnected", newlyDisconnected);
                    quarterData.put("newlyConnected", 0L);
                    quarterData.put("newlyDisconnected", newlyDisconnected);
                } else {
                    // Normal display (active, inactive, or no filter)
                    quarterData.put("connected", totalConnected);
                    quarterData.put("disconnected", totalDisconnected);
                    quarterData.put("newlyConnected", newlyConnected);
                    quarterData.put("newlyDisconnected", newlyDisconnected);
                }
                
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
                // Skip if quarter filter is set and doesn't match current quarter
                if (quarterFilter != null && !quarterFilter.isEmpty() && !quarters[i].equals(quarterFilter)) {
                    continue;
                }
                
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
     * Get current user's area ID (same as in PostalOfficeService)
     * Returns null for admin users (no area restriction)
     */
    private Integer getCurrentUserAreaId() {
        try {
            org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return null;
            }
            
            // Use the service to get user area
            Map<String, Object> userInfo = postalOfficeService.getCurrentUserInfo();
            if (userInfo != null && Boolean.TRUE.equals(userInfo.get("canAccessAllAreas"))) {
                return null; // Admin user
            }
            return userInfo != null ? (Integer) userInfo.get("areaId") : null;
        } catch (Exception e) {
            // Log error but don't break the application
            System.err.println("Error getting current user area: " + e.getMessage());
        }
        return null;
    }
    
    /**
     * Helper method to get the last day of a month
     */
    private int getLastDayOfMonth(int year, int month) {
        return java.time.YearMonth.of(year, month).lengthOfMonth();
    }
    
    private String getRoleName(Integer roleId) {
        if (roleId == null) return "Unknown";
        switch (roleId) {
            case 1: return "Administrator";
            case 2: return "User";
            case 3: return "Area Admin";
            default: return "Unknown";
        }
    }
    
    private String getRoleColor(Integer roleId) {
        if (roleId == null) return "secondary";
        switch (roleId) {
            case 1: return "danger";
            case 2: return "primary";
            case 3: return "warning";
            default: return "secondary";
        }
    }
}
