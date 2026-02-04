package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.Area;
import com.pps.profilesystem.Repository.AreaRepository;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Repository.RegionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;
import java.util.Map;

@Controller
public class DashboardController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private AreaRepository areaRepository;

    @Autowired
    private RegionRepository regionRepository;

    @GetMapping("/dashboard")
    public String showDashboard(Model model) {
        // 1. Fetch lookup data for the filters
        List<Area> areas = areaRepository.findAll();
        
        // 2. Add data to the Model for Thymeleaf
        model.addAttribute("areas", areas);
        model.addAttribute("full_name", "Admin User"); // Static for now as requested
        model.addAttribute("position", "System Administrator");
        
        // 3. User Access logic (Static placeholder for your JS window.userAccess)
        model.addAttribute("userAccess", Map.of(
            "can_access_all_areas", true,
            "assigned_area", "All"
        ));

        // Return the name of your HTML file (dashboard.html)
        return "dashboard";
    }
}