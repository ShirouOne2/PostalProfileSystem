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
import java.util.*;

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

        // Set current year if not provided
        int currentYear = (year != null) ? year : LocalDate.now().getYear();
        
        // Get current quarter info
        Map<String, Object> currentQuarterInfo = getCurrentQuarterInfo();
        
        // Get connectivity statistics
        Map<String, Long> connectivityStats = getConnectivityStats();
        
        // Get all areas
        List<String> areas = getAreaNames();
        
        // Get quarters data for the year
        List<Map<String, Object>> quartersData = getQuartersData(currentYear);
        
        // Add attributes to model
        model.addAttribute("currentYear", currentYear);
        model.addAttribute("currentQuarterInfo", currentQuarterInfo);
        model.addAttribute("connectivityStats", connectivityStats);
        model.addAttribute("areas", areas);
        model.addAttribute("quartersData", quartersData);
        model.addAttribute("selectedAreaFilter", areaFilter);
        model.addAttribute("selectedQuarterFilter", quarterFilter);
        model.addAttribute("selectedStatusFilter", statusFilter);
        model.addAttribute("activePage", "quarters");
        
        // Add user access (you can customize this based on your security setup)
        Map<String, Boolean> userAccess = new HashMap<>();
        userAccess.put("can_access_all_areas", true); // Modify based on your user permissions
        model.addAttribute("userAccess", userAccess);

        return "quarter"; // This maps to quarter.html
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
        long daysUntilNext; // Changed from int to long
        
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
        
        long totalConnected = postalOfficeRepository.countByConnectionStatus(true);
        long totalDisconnected = postalOfficeRepository.countByConnectionStatus(false);
        long totalOffices = postalOfficeRepository.count();
        
        stats.put("totalConnected", totalConnected);
        stats.put("totalDisconnected", totalDisconnected);
        stats.put("totalOffices", totalOffices);
        
        return stats;
    }

    /**
     * Get list of area names
     */
    private List<String> getAreaNames() {
        List<Area> areas = areaRepository.findAll();
        List<String> areaNames = new ArrayList<>();
        
        for (Area area : areas) {
            // Use getId() or getAreaName() depending on your Area entity
            areaNames.add("Area " + area.getId()); // Changed from getName() to getId()
        }
        
        return areaNames;
    }

    /**
     * Get quarters data for a specific year
     */
    private List<Map<String, Object>> getQuartersData(int year) {
        List<Map<String, Object>> quartersData = new ArrayList<>();
        
        String[] quarters = {"Q1", "Q2", "Q3", "Q4"};
        LocalDate now = LocalDate.now();
        int currentQuarter = (now.getMonthValue() - 1) / 3;
        
        for (int i = 0; i < quarters.length; i++) {
            Map<String, Object> quarterData = new HashMap<>();
            
            quarterData.put("quarter", quarters[i]);
            quarterData.put("year", year);
            quarterData.put("connected", postalOfficeRepository.countByConnectionStatus(true));
            quarterData.put("disconnected", postalOfficeRepository.countByConnectionStatus(false));
            quarterData.put("newConnected", 0L); // You'll need to implement logic to track new connections per quarter
            quarterData.put("newDisconnected", 0L); // You'll need to implement logic to track new disconnections per quarter
            quarterData.put("isCurrent", year == now.getYear() && i == currentQuarter);
            
            quartersData.add(quarterData);
        }
        
        return quartersData;
    }
}