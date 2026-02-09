package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Service.LocationHierarchyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Controller for the Insert Post Office page
 * Refactored to use services instead of direct repository access
 */
@Controller
@RequestMapping("/insert")
public class InsertOfficeController {

    @Autowired
    private LocationHierarchyService locationService;

    /**
     * Display the insert post office page
     * @param model Spring MVC model
     * @return insert-office view name
     */
    @GetMapping
    public String showInsertPage(Model model) {
        
        // Load areas and regions for dropdowns using service
        model.addAttribute("areas", locationService.getAllAreas());
        model.addAttribute("regions", locationService.getAllRegions());
        model.addAttribute("activePage", "insert");
        
        return "insert-office";
    }
}