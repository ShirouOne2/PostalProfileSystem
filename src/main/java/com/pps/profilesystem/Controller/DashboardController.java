package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.User;
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
        
        // Add user access information
        model.addAttribute("userAccess", postalOfficeService.getCurrentUserInfo());
        
        // Add current user information for header
        User currentUser = postalOfficeService.getCurrentUser();
        if (currentUser != null) {
            model.addAttribute("user", currentUser);
            model.addAttribute("roleName", getRoleName(currentUser.getRole()));
            model.addAttribute("roleColor", getRoleColor(currentUser.getRole()));
        }

        return "dashboard";
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