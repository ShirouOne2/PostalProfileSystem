package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Service.LocationHierarchyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Controller for displaying postal offices in a data table
 * Uses repository directly for data access and service for location data
 */
@Controller
@RequestMapping("/table")
public class DataTableController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private LocationHierarchyService locationService;

    @GetMapping
    @Transactional(readOnly = true)
    public String viewPostOffices(Model model) {

        // Get data using repository
        model.addAttribute("offices", postalOfficeRepository.findAllNonArchivedWithConnectivity()
            .stream()
            .map(this::convertToMapDTO)
            .collect(java.util.stream.Collectors.toList()));
        model.addAttribute("totalCount", postalOfficeRepository.countByIsArchivedFalse());
        model.addAttribute("activeCount", postalOfficeRepository.countByConnectionStatusAndIsArchivedFalse(true));
        model.addAttribute("inactiveCount", postalOfficeRepository.countByConnectionStatusAndIsArchivedFalse(false));
        model.addAttribute("areaCount", postalOfficeRepository.countDistinctAreasNonArchived());
        
        // For modal dropdowns
        model.addAttribute("areas", locationService.getAllAreas());
        model.addAttribute("regions", locationService.getAllRegions());
        
        model.addAttribute("activePage", "table");
        
        return "table";
    }

    private java.util.Map<String, Object> convertToMapDTO(com.pps.profilesystem.Entity.PostalOffice office) {
        java.util.Map<String, Object> dto = new java.util.HashMap<>();
        dto.put("id", office.getId());
        dto.put("name", office.getName());
        dto.put("address", office.getAddress());
        dto.put("zipCode", office.getZipCode());
        dto.put("postmaster", office.getPostmaster());
        dto.put("noOfEmployees", office.getNoOfEmployees());
        dto.put("latitude", office.getLatitude());
        dto.put("longitude", office.getLongitude());
        dto.put("connectionStatus", office.getConnectionStatus());
        dto.put("speed", office.getSpeed());
        dto.put("area", office.getArea() != null ? office.getArea().getAreaName() : null);
        dto.put("region", office.getRegion() != null ? office.getRegion().getName() : null);
        dto.put("province", office.getProvince() != null ? office.getProvince().getName() : null);
        dto.put("cityMunicipality", office.getCityMunicipality() != null ? office.getCityMunicipality().getName() : null);
        dto.put("barangay", office.getBarangay() != null ? office.getBarangay().getName() : null);
        return dto;
    }
}