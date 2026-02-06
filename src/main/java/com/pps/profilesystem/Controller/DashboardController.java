package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.Area;
import com.pps.profilesystem.Entity.Region;
import com.pps.profilesystem.Repository.AreaRepository;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Repository.RegionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

/**
 * Dashboard Controller
 * Handles the main dashboard view with statistics and filters
 */
@Controller
public class DashboardController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private AreaRepository areaRepository;

    @Autowired
    private RegionRepository regionRepository;

    /**
     * Display the dashboard page
     * @param model Spring MVC model
     * @return dashboard view name
     */
    @GetMapping("/dashboard")
    public String showDashboard(Model model) {

        // Get statistics
        long totalOffices = postalOfficeRepository.count();
        long activeOffices = postalOfficeRepository.countByConnectionStatus(true);
        long inactiveOffices = postalOfficeRepository.countByConnectionStatus(false);

        // Get filter data
        List<Area> areas = areaRepository.findAll();
        List<Region> regions = regionRepository.findAll();

        // Add to model
        model.addAttribute("totalOffices", totalOffices);
        model.addAttribute("activeOffices", activeOffices);
        model.addAttribute("inactiveOffices", inactiveOffices);
        model.addAttribute("areas", areas);
        model.addAttribute("regions", regions); // For modal dropdown
        model.addAttribute("activePage", "dashboard");
        return "dashboard";
    }
}