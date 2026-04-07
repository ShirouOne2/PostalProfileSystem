package com.pps.profilesystem.Controller;

import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

/**
 * Global controller advice to add common data to all models
 * This ensures dashboard statistics are available in the sidebar across all pages
 */
@ControllerAdvice
public class GlobalControllerAdvice {

    /**
     * Add dashboard statistics to all models
     * This will be called before each controller method
     */
    @ModelAttribute
    public void addGlobalAttributes(Model model) {
        // Disabled to prevent connection leaks on table page
        // Dashboard stats are now handled per-page as needed
    }
}
