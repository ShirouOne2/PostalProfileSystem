package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Service.LocationHierarchyService;
import com.pps.profilesystem.Service.PostalOfficeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Dashboard Controller
 * Refactored to use services instead of direct repository access
 */
@Controller
public class DashboardController {

    @Autowired
    private PostalOfficeService postalOfficeService;

    @Autowired
    private LocationHierarchyService locationService;

    @GetMapping("/dashboard")
    public String showDashboard(Model model) {

        // Get statistics using service
        long totalOffices = postalOfficeService.getTotalCount();
        long activeOffices = postalOfficeService.getActiveCount();
        long inactiveOffices = postalOfficeService.getInactiveCount();

        // Get location data using service
        model.addAttribute("areas", locationService.getAllAreas());
        model.addAttribute("regions", locationService.getAllRegions());
        
        // Add statistics to model
        model.addAttribute("totalOffices", totalOffices);
        model.addAttribute("activeOffices", activeOffices);
        model.addAttribute("inactiveOffices", inactiveOffices);
        model.addAttribute("activePage", "dashboard");

        return "dashboard";
    }
}