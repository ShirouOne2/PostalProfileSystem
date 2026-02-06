package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.Area;
import com.pps.profilesystem.Entity.Regions;
import com.pps.profilesystem.Repository.AreaRepository;
import com.pps.profilesystem.Repository.RegionsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;

/**
 * Controller for the Insert Post Office page
 */
@Controller
@RequestMapping("/insert")
public class InsertOfficeController {

    @Autowired
    private AreaRepository areaRepository;

    @Autowired
    private RegionsRepository regionRepository;

    /**
     * Display the insert post office page
     * @param model Spring MVC model
     * @return insert-office view name
     */
    @GetMapping
    public String showInsertPage(Model model) {
        
        // Load areas and regions for dropdowns
        List<Area> areas = areaRepository.findAll();
        List<Regions> regions = regionRepository.findAll();
        
        // Add to model
        model.addAttribute("areas", areas);
        model.addAttribute("regions", regions);
        model.addAttribute("activePage", "insert");
        
        return "insert-office";
    }
}