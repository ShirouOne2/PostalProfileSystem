package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Service.PostalOfficeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.Month;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST Controller for map-related postal office data
 * Returns postal offices with coordinates for map visualization
 */
@RestController
@RequestMapping("/api")
public class MapController {

    @Autowired
    private PostalOfficeService postalOfficeService;

    /**
     * Get all post offices with their coordinates for map display
     * @return List of post offices as Map objects
     */
    @GetMapping("/post-offices")
    public List<Map<String, Object>> getPostOffices() {
        return postalOfficeService.getAllPostalOfficesForMap();
    }

    /**
     * Get all post offices for table display (includes those without coordinates)
     * Supports filtering by year, quarter, area, and status
     * @return List of all post offices as Map objects
     */
    @GetMapping("/post-offices/all")
    public List<Map<String, Object>> getAllPostOffices(
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String quarter,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String status) {
        
        // If no filters provided, return all offices
        if (year == null && quarter == null && area == null && status == null) {
            return postalOfficeService.getAllPostalOfficesForTable();
        }
        
        // Parse year and quarter if provided
        Integer yearInt = null;
        Integer quarterInt = null;
        
        if (year != null && !year.trim().isEmpty()) {
            try {
                yearInt = Integer.parseInt(year.trim());
            } catch (NumberFormatException e) {
                // Invalid year format, ignore and return all
                return postalOfficeService.getAllPostalOfficesForTable();
            }
        }
        
        if (quarter != null && !quarter.trim().isEmpty()) {
            // Extract quarter number from "Q1", "Q2", etc.
            String quarterStr = quarter.trim().toUpperCase();
            if (quarterStr.startsWith("Q")) {
                try {
                    quarterInt = Integer.parseInt(quarterStr.substring(1));
                    if (quarterInt < 1 || quarterInt > 4) {
                        quarterInt = null; // Invalid quarter
                    }
                } catch (NumberFormatException e) {
                    quarterInt = null;
                }
            }
        }
        
        // Parse area if provided
        Integer areaTemp = null;
        if (area != null && !area.trim().isEmpty()) {
            try {
                areaTemp = Integer.parseInt(area.trim());
            } catch (NumberFormatException e) {
                areaTemp = null;
            }
        }
        final Integer areaInt = areaTemp;
        
        // If we have year and quarter filters, use date-based filtering
        if (yearInt != null && quarterInt != null) {
            LocalDateTime[] quarterDates = getQuarterDateRange(yearInt, quarterInt);
            return postalOfficeService.getPostOfficesByDateRange(
                quarterDates[0], quarterDates[1], 
                status != null && status.equals("newly_disconnected") ? "disconnected" : "connected",
                status);
        }
        
        // Handle newly_connected/disconnected without specific quarter (use current quarter)
        if (yearInt != null && (status != null && (status.equals("newly_connected") || status.equals("newly_disconnected")))) {
            LocalDateTime now = LocalDateTime.now();
            int currentQuarter = (now.getMonthValue() - 1) / 3 + 1;
            LocalDateTime[] quarterDates = getQuarterDateRange(yearInt, currentQuarter);
            return postalOfficeService.getPostOfficesByDateRange(
                quarterDates[0], quarterDates[1], 
                status.equals("newly_disconnected") ? "disconnected" : "connected",
                status);
        }
        
        // Otherwise, use basic filtering
        List<Map<String, Object>> offices = postalOfficeService.getAllPostalOfficesForTable();
        
        // Apply area filter
        if (areaInt != null) {
            offices = offices.stream()
                .filter(office -> {
                    Object areaId = office.get("areaId");
                    return areaId != null && areaId.equals(areaInt);
                })
                .collect(Collectors.toList());
        }
        
        // Apply status filter
        if (status != null && !status.trim().isEmpty()) {
            String statusFilter = status.trim();
            offices = offices.stream()
                .filter(office -> {
                    Boolean officeStatus = (Boolean) office.get("status");
                    if ("active".equals(statusFilter)) {
                        return Boolean.TRUE.equals(officeStatus);
                    } else if ("inactive".equals(statusFilter)) {
                        return !Boolean.TRUE.equals(officeStatus);
                    }
                    // For newly_connected/disconnected, we'd need date-based filtering
                    // which is handled above in date range filtering
                    return true;
                })
                .collect(Collectors.toList());
        }
        
        return offices;
    }
    
    /**
     * Helper method to get the date range for a specific quarter
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
}