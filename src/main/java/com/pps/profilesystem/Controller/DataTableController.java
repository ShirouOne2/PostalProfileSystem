package com.pps.profilesystem.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.pps.profilesystem.Service.LocationHierarchyService;
import com.pps.profilesystem.Service.PostalOfficeService;

/**
 * Controller for displaying postal offices in a data table
 * Refactored to use services instead of direct repository access
 */
@Controller
@RequestMapping("/table")
public class DataTableController {

    @Autowired
    private PostalOfficeService postalOfficeService;

    @Autowired
    private LocationHierarchyService locationService;

    @GetMapping
    @Transactional(readOnly = true)
    public String viewPostOffices(Model model) {

        // Get data using services
        model.addAttribute("offices", postalOfficeService.getAllPostalOffices());
        model.addAttribute("totalCount", postalOfficeService.getTotalCount());
        model.addAttribute("activeCount", postalOfficeService.getActiveCount());
        model.addAttribute("inactiveCount", postalOfficeService.getInactiveCount());
        model.addAttribute("areaCount", postalOfficeService.getDistinctAreasCount());
        
        // For modal dropdowns
        model.addAttribute("areas", locationService.getAllAreas());
        model.addAttribute("regions", locationService.getAllRegions());
        
        model.addAttribute("activePage", "table");
        
        return "table";
    }
}