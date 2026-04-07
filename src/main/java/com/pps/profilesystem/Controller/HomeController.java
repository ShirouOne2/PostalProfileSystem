package com.pps.profilesystem.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Home Controller - handles root URL redirection and error pages
 */
@Controller
public class HomeController {

    /**
     * Redirect root URL "/" to "/dashboard"
     */
    @GetMapping("/")
    public String home() {
        return "redirect:/dashboard";
    }

    /**
     * Access denied page for 403 errors
     */
    @GetMapping("/access-denied")
    public String accessDenied() {
        return "access-denied";
    }
}
