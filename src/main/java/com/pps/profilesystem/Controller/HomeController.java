package com.pps.profilesystem.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Home Controller - handles root URL redirection
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
}
