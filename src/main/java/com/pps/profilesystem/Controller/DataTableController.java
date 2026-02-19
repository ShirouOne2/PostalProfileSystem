package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Service.PostalOfficeService;
import com.pps.profilesystem.Service.LocationHierarchyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Controller for displaying postal offices in a data table
 * Refactored to use services instead of direct repository access
 */
@Controller
@RequestMapping("/table")
public class DataTableController {

    @Autowired
    private PostalOfficeService postalOfficeService;

    @Autowired
    private LocationHierarchyService locationService;

    @GetMapping
    @Transactional(readOnly = true)
    public String viewPostOffices(Model model) {

        // Get data using services
        model.addAttribute("offices", postalOfficeService.getAllPostalOffices());
        model.addAttribute("totalCount", postalOfficeService.getTotalCount());
        model.addAttribute("activeCount", postalOfficeService.getActiveCount());
        model.addAttribute("inactiveCount", postalOfficeService.getInactiveCount());
        model.addAttribute("areaCount", postalOfficeService.getDistinctAreasCount());
        
        // For modal dropdowns
        model.addAttribute("areas", locationService.getAllAreas());
        model.addAttribute("regions", locationService.getAllRegions());
        
        model.addAttribute("activePage", "table");
        
        // Add user access information
        model.addAttribute("userAccess", postalOfficeService.getCurrentUserInfo());
        
        // Add current user information for header
        User currentUser = postalOfficeService.getCurrentUser();
        if (currentUser != null) {
            model.addAttribute("user", currentUser);
            model.addAttribute("roleName", getRoleName(currentUser.getRole()));
            model.addAttribute("roleColor", getRoleColor(currentUser.getRole()));
        }
        
        return "table";
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