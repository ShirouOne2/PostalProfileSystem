package com.pps.profilesystem.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * DashboardController
 *
 * /dashboard now simply redirects to /table which is the main inventory page.
 * All stats, map, and table data are loaded directly in DataTableController.
 */
@Controller
public class DashboardController {

    @GetMapping("/dashboard")
    public String dashboard() {
        return "redirect:/table";
    }
}