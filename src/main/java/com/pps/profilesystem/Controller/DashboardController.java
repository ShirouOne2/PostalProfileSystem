package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Service.LocationHierarchyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Dashboard Controller
 * Uses repository directly for statistics and service for location data
 */
@Controller
public class DashboardController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private LocationHierarchyService locationService;

    @GetMapping("/dashboard")
    public String showDashboard(Model model) {

        // Get statistics using repository
        long totalOffices = postalOfficeRepository.countByIsArchivedFalse();
        long activeOffices = postalOfficeRepository.countByConnectionStatusAndIsArchivedFalse(true);
        long inactiveOffices = postalOfficeRepository.countByConnectionStatusAndIsArchivedFalse(false);

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