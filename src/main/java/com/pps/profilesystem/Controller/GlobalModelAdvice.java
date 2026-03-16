package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
public class GlobalModelAdvice {

    @Autowired
    private UserRepository userRepository;

    @ModelAttribute
    public void addLoggedInUser(Model model) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated()
                && !auth.getPrincipal().equals("anonymousUser")) {

            String email = auth.getName();

            userRepository.findByEmail(email).ifPresent((User user) -> {
                model.addAttribute("loggedInUsername",  user.getUsername());
                model.addAttribute("loggedInEmail",     user.getEmail());
                model.addAttribute("loggedInRole",      getRoleLabel(user.getRole()));
                model.addAttribute("loggedInInitial",   getInitial(user.getUsername()));
                model.addAttribute("loggedInRoleId",    user.getRole());    // 1=Admin, 2=AreaAdmin, 3=User
                model.addAttribute("loggedInAreaId",    user.getAreaId());  // null if System Admin
            });
        }
    }

    private String getRoleLabel(Integer roleId) {
        if (roleId == null) return "User";
        switch (roleId) {
            case 1:  return "System Admin";
            case 2:  return "Area Admin";
            case 3:  return "User";
            default: return "User";
        }
    }

    private String getInitial(String username) {
        if (username == null || username.isEmpty()) return "?";
        return String.valueOf(Character.toUpperCase(username.charAt(0)));
    }
}