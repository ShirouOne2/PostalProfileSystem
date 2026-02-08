package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.Area;
import com.pps.profilesystem.Entity.Regions;
import com.pps.profilesystem.Repository.AreaRepository;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Repository.RegionsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@Controller
public class DashboardController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private AreaRepository areaRepository;

    @Autowired
    private RegionsRepository regionRepository;

    @GetMapping("/dashboard")
    public String showDashboard(Model model) {

        long totalOffices = postalOfficeRepository.count();
        long activeOffices = postalOfficeRepository.countByConnectionStatus(true);
        long inactiveOffices = postalOfficeRepository.countByConnectionStatus(false);

        List<Area> areas = areaRepository.findAll();
        List<Regions> regions = regionRepository.findAll();

        model.addAttribute("totalOffices", totalOffices);
        model.addAttribute("activeOffices", activeOffices);
        model.addAttribute("inactiveOffices", inactiveOffices);
        model.addAttribute("areas", areas);
        model.addAttribute("regions", regions);
        model.addAttribute("activePage", "dashboard");

        return "dashboard";
    }
}
