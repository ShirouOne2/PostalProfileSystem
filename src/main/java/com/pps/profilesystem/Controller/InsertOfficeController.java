package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Service.LocationHierarchyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Controller for displaying the Insert Post Office page
 */
@Controller
@RequestMapping("/insert")
public class InsertOfficeController {

    @Autowired
    private LocationHierarchyService locationService;

    @GetMapping
    public String showInsertPage(Model model) {
        model.addAttribute("areas", locationService.getAllAreas());
        model.addAttribute("activePage", "insert");
        return "insert-office";
    }
}
