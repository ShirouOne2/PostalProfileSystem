package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Service.LocationHierarchyService;
import com.pps.profilesystem.Service.PostalOfficeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Controller for displaying the Insert Post Office page
 */
@Controller
@RequestMapping("/insert")
public class InsertOfficeController {

    @Autowired
    private LocationHierarchyService locationService;
    
    @Autowired
    private PostalOfficeService postalOfficeService;

    @GetMapping
    public String showInsertPage(Model model) {
        model.addAttribute("areas", locationService.getAllAreas());
        model.addAttribute("regions", locationService.getAllRegions());
        model.addAttribute("activePage", "insert");
        
        // Add current user information for header
        User currentUser = postalOfficeService.getCurrentUser();
        if (currentUser != null) {
            model.addAttribute("user", currentUser);
            model.addAttribute("roleName", getRoleName(currentUser.getRole()));
            model.addAttribute("roleColor", getRoleColor(currentUser.getRole()));
        }
        
        return "insert-office";
    }
    
    private String getRoleName(Integer roleId) {
        if (roleId == null) return "Unknown";
        switch (roleId) {
            case 1: return "Administrator";
            case 2: return "Regional Manager";
            case 3: return "Area Manager";
            case 4: return "Office Staff";
            default: return "User";
        }
    }
    
    private String getRoleColor(Integer roleId) {
        if (roleId == null) return "secondary";
        switch (roleId) {
            case 1: return "danger";    // Admin - red
            case 2: return "warning";   // Regional Manager - orange
            case 3: return "info";      // Area Manager - blue
            case 4: return "success";   // Office Staff - green
            default: return "secondary";
        }
    }
}
