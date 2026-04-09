package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Repository.UserRepository;
import com.pps.profilesystem.Service.DashboardStatsService;
import com.pps.profilesystem.Service.LocationHierarchyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;
import java.util.stream.Collectors;

import java.util.List;
import java.util.stream.Collectors;

/**
 * DashboardController
 *
 * Displays the main dashboard with statistics and overview
 */
@Controller
@RequestMapping("/dashboard")
public class DashboardController {

    @Autowired
    private DashboardStatsService dashboardStatsService;

    @Autowired
    private LocationHierarchyService locationService;

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public String dashboard(Model model) {
        // Get the logged-in user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User currentUser = userRepository.findByEmail(email).orElse(null);

        Integer roleId = currentUser != null ? currentUser.getRole()   : null;
        Integer areaId = currentUser != null ? currentUser.getAreaId() : null;

        // Fetch offices based on role
        List<PostalOffice> offices;

        if (roleId != null && roleId == 1) {
            offices = postalOfficeRepository.findAllNonArchivedWithConnectivity();
        } else {
            offices = postalOfficeRepository.findAllNonArchivedWithConnectivity()
                .stream()
                .filter(po -> {
                    if (areaId == null) return false;
                    return po.getArea() != null && areaId.equals(po.getArea().getId());
                })
                .collect(Collectors.toList());
        }

        // Add dashboard statistics
        dashboardStatsService.addDashboardStatsToModel(model);
        
        // Add offices data for the table
        model.addAttribute("offices", offices.stream().map(this::convertToMapDTO).collect(Collectors.toList()));
        
        // Add areas for dropdown
        model.addAttribute("areas", locationService.getAllAreas());
        
        // Set active page and role flags
        model.addAttribute("activePage", "dashboard");
        model.addAttribute("isSystemAdmin", roleId != null && roleId == 1);
        model.addAttribute("isAreaAdmin", roleId != null && roleId == 2);
        
        // For edit modal JavaScript
        model.addAttribute("loggedInRoleId", roleId);
        model.addAttribute("loggedInAreaId", areaId);

        return "dashboard";
    }

    private java.util.Map<String, Object> convertToMapDTO(PostalOffice office) {
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
        dto.put("officeStatus", office.getOfficeStatus());
        dto.put("speed", office.getSpeed());
        dto.put("remarks", office.getRemarks());
        
        // Add missing fields that were causing blank inputs
        dto.put("classification", office.getClassification());
        dto.put("serviceProvided", office.getServiceProvided());
        dto.put("internetServiceProvider", office.getInternetServiceProvider());
        dto.put("typeOfConnection", office.getTypeOfConnection());
        dto.put("staticIpAddress", office.getStaticIpAddress());
        dto.put("noOfPostalTellers", office.getNoOfPostalTellers());
        dto.put("noOfLetterCarriers", office.getNoOfLetterCarriers());
        dto.put("postalOfficeContactPerson", office.getPostalOfficeContactPerson());
        dto.put("postalOfficeContactNumber", office.getPostalOfficeContactNumber());
        dto.put("ispContactPerson", office.getIspContactPerson());
        dto.put("ispContactNumber", office.getIspContactNumber());

        // Area is EAGER — safe to access directly
        dto.put("area", office.getArea() != null ? office.getArea().getAreaName() : null);
        dto.put("areaId", office.getArea() != null ? office.getArea().getId() : null);

        // LAZY associations — wrapped in try-catch to survive any
        // Hibernate proxy edge cases (e.g. uninitialized proxy after DISTINCT query).
        try { 
            dto.put("region", office.getRegion() != null ? office.getRegion().getName() : null);
            dto.put("regionId", office.getRegion() != null ? office.getRegion().getId() : null);
        } catch (Exception e) { 
            dto.put("region", null);
            dto.put("regionId", null);
        }

        try { 
            dto.put("province", office.getProvince() != null ? office.getProvince().getName() : null);
            dto.put("provinceId", office.getProvince() != null ? office.getProvince().getId() : null);
        } catch (Exception e) { 
            dto.put("province", null);
            dto.put("provinceId", null);
        }

        try { 
            dto.put("cityMunicipality", office.getCityMunicipality() != null ? office.getCityMunicipality().getName() : null);
            dto.put("cityMunId", office.getCityMunicipality() != null ? office.getCityMunicipality().getId() : null);
        } catch (Exception e) { 
            dto.put("cityMunicipality", null);
            dto.put("cityMunId", null);
        }

        try { 
            dto.put("barangay", office.getBarangay() != null ? office.getBarangay().getName() : null);
            dto.put("barangayId", office.getBarangay() != null ? office.getBarangay().getId() : null);
        } catch (Exception e) { 
            dto.put("barangay", null);
            dto.put("barangayId", null);
        }

        dto.put("officeStatus",     office.getOfficeStatus());
        dto.put("speed",            office.getSpeed());
        dto.put("area",             office.getArea()            != null ? office.getArea().getAreaName()         : null);
        dto.put("region",           office.getRegion()          != null ? office.getRegion().getName()           : null);
        dto.put("province",         office.getProvince()        != null ? office.getProvince().getName()         : null);
        dto.put("cityMunicipality", office.getCityMunicipality()!= null ? office.getCityMunicipality().getName() : null);
        dto.put("barangay",         office.getBarangay()        != null ? office.getBarangay().getName()         : null);
        dto.put("remarks",          office.getRemarks());
        return dto;
    }
}
