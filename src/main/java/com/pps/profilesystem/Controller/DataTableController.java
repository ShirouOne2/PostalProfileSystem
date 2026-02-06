package com.pps.profilesystem.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.pps.profilesystem.Entity.Area;
import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Entity.Region;
import com.pps.profilesystem.Repository.AreaRepository;
import com.pps.profilesystem.Repository.RegionRepository;
import com.pps.profilesystem.Service.LocationService;

import java.util.List;

@Controller
@RequestMapping("/table")
public class DataTableController {

    @Autowired
    private LocationService locationService;

    @Autowired
    private AreaRepository areaRepository;

    @Autowired
    private RegionRepository regionRepository;

    @GetMapping
    public String viewPostOffices(Model model) {

        List<PostalOffice> offices = locationService.getAllOffices();
        List<Area> areas = areaRepository.findAll();
        List<Region> regions = regionRepository.findAll();

        model.addAttribute("offices", offices);
        model.addAttribute("totalCount", locationService.countAll());
        model.addAttribute("activeCount", locationService.countActive());
        model.addAttribute("inactiveCount", locationService.countInactive());
        model.addAttribute("areaCount", locationService.countAreas());
        model.addAttribute("areas", areas); // For modal dropdown
        model.addAttribute("regions", regions); // For modal dropdown
        model.addAttribute("activePage", "table");
        return "table"; // <-- table.html
    }
}