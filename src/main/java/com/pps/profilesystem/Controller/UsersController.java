package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Service.PostalOfficeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.servlet.view.RedirectView;

@Controller
public class UsersController {

    @Autowired
    private PostalOfficeService postalOfficeService;

    @GetMapping("/users")
    public String usersManagement(Model model) {
        model.addAttribute("activePage", "users");
        
        // Add current user information for header
        User currentUser = postalOfficeService.getCurrentUser();
        if (currentUser != null) {
            model.addAttribute("user", currentUser);
            model.addAttribute("roleName", getRoleName(currentUser.getRole()));
            model.addAttribute("roleColor", getRoleColor(currentUser.getRole()));
        }
        
        return "users-management"; // Points to src/main/resources/templates/users-management.html
    }

    @GetMapping("/register")
    public RedirectView register() {
        return new RedirectView("/users");
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
