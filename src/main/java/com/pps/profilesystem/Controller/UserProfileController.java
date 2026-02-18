package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Optional;

/**
 * UserProfileController
 *
 * Serves the logged-in user's own profile page at GET /my-profile
 */
@Controller
public class UserProfileController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping({"/my-profile", "/profile"})
    public String myProfile(Model model) {

        // Get the currently logged-in user's email (principal = email per CustomUserDetailsService)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return "redirect:/dashboard";
        }

        User user = userOpt.get();

        // Map role integer to display string
        String roleName = getRoleName(user.getRole());
        String roleColor = getRoleColor(user.getRole());

        model.addAttribute("user",       user);
        model.addAttribute("roleName",   roleName);
        model.addAttribute("roleColor",  roleColor);
        model.addAttribute("activePage", "my-profile");

        return "user-profile";
    }

    private String getRoleName(Integer roleId) {
        if (roleId == null) return "User";
        switch (roleId) {
            case 1: return "Administrator";
            case 2: return "Area Admin";
            case 3: return "User";
            default: return "User";
        }
    }

    private String getRoleColor(Integer roleId) {
        if (roleId == null) return "secondary";
        switch (roleId) {
            case 1: return "danger";    // Admin  → red
            case 2: return "warning";   // Area Admin → yellow
            case 3: return "primary";   // User → blue
            default: return "secondary";
        }
    }
}