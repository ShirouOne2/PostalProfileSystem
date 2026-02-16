package com.pps.profilesystem.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.servlet.view.RedirectView;

@Controller
public class UsersController {

    @GetMapping("/users")
    public String usersManagement(Model model) {
        model.addAttribute("activePage", "users");
        return "users-management"; // Points to src/main/resources/templates/users-management.html
    }

    @GetMapping("/register")
    public RedirectView register() {
        return new RedirectView("/users");
    }
}
