package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.servlet.view.RedirectView;

/**
 * Serves the User Management page at /users.
 *
 * System Admin (role 1) → sees and manages ALL users.
 * Area Admin   (role 2) → sees and manages ONLY users in their assigned area.
 */
@Controller
public class UsersController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/users")
    public String usersManagement(Model model) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = userRepository.findByEmail(auth.getName()).orElse(null);

        boolean isSystemAdmin = currentUser != null && Integer.valueOf(1).equals(currentUser.getRole());
        boolean isAreaAdmin   = currentUser != null && Integer.valueOf(2).equals(currentUser.getRole());
        boolean isSrdOperation = currentUser != null && Integer.valueOf(4).equals(currentUser.getRole());
        Integer areaId        = currentUser != null ? currentUser.getAreaId() : null;

        model.addAttribute("activePage",       "users");
        model.addAttribute("isSystemAdmin",    isSystemAdmin);
        model.addAttribute("isAreaAdmin",      isAreaAdmin);
        model.addAttribute("isSrdOperation",   isSrdOperation);
        model.addAttribute("currentAreaId",    areaId);

        return "users-management";
    }

    @GetMapping("/register")
    public RedirectView register() {
        return new RedirectView("/users");
    }
}