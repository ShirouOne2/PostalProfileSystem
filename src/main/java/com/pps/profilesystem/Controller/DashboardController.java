package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Service.LocationHierarchyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashboardController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private LocationHierarchyService locationService;

    @GetMapping("/dashboard")
    public String showDashboard(Model model) {

        long totalOffices    = postalOfficeRepository.countNonArchived();
        long activeOffices   = postalOfficeRepository.countNonArchivedByConnectionStatus(true);
        long inactiveOffices = postalOfficeRepository.countNonArchivedByConnectionStatus(false);
        long openOffices     = postalOfficeRepository.countOpenOffices();
        long closedOffices   = postalOfficeRepository.countClosedOffices();

        model.addAttribute("areas",          locationService.getAllAreas());
        model.addAttribute("regions",        locationService.getAllRegions());
        model.addAttribute("totalOffices",   totalOffices);
        model.addAttribute("activeOffices",  activeOffices);
        model.addAttribute("inactiveOffices",inactiveOffices);
        model.addAttribute("openOffices",    openOffices);
        model.addAttribute("closedOffices",  closedOffices);
        model.addAttribute("activePage",     "dashboard");

        return "dashboard";
    }
}