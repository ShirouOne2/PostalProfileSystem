package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.Area;
import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Repository.UserRepository;
import com.pps.profilesystem.Service.LocationHierarchyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;
import java.util.stream.Collectors;

/**
 * DashboardController
 *
 * Renders the dashboard page with stats, filters, and system admin table.
 * System admins see the full detailed table, while other users see simplified data.
 */
@Controller
public class DashboardController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private LocationHierarchyService locationService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/dashboard")
    @Transactional(readOnly = true)
    public String dashboard(Model model) {

        // Get the logged-in user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User currentUser = userRepository.findByEmail(email).orElse(null);

        Integer roleId = currentUser != null ? currentUser.getRole()   : null;
        Integer areaId = currentUser != null ? currentUser.getAreaId() : null;

        // Fetch offices based on role.
        // Uses findAllNonArchivedForTable() — a dedicated query without the
        // activeConnectivity JOIN FETCH, which prevents Hibernate from silently
        // dropping the region/province/city joins due to multi-bag fetch conflicts.
        List<PostalOffice> offices;

        if (roleId != null && (roleId == 1 || roleId == 4)) {
            offices = postalOfficeRepository.findAllNonArchivedForTable();
        } else {
            offices = postalOfficeRepository.findAllNonArchivedForTable()
                .stream()
                .filter(po -> {
                    if (areaId == null) return false;
                    return po.getArea() != null && areaId.equals(po.getArea().getId());
                })
                .collect(Collectors.toList());
        }

        // Stats — derived from the already-fetched list (no extra DB queries)
        long totalCount    = offices.size();
        long activeCount   = offices.stream()
            .filter(po -> Boolean.TRUE.equals(po.getConnectionStatus())).count();
        long inactiveCount = totalCount - activeCount;
        long openCount     = offices.stream()
            .filter(po -> "OPEN".equalsIgnoreCase(po.getOfficeStatus())).count();
        long closedCount   = offices.stream()
            .filter(po -> "CLOSED".equalsIgnoreCase(po.getOfficeStatus())).count();

        model.addAttribute("offices",       offices.stream().map(this::convertToMapDTO).collect(Collectors.toList()));
        model.addAttribute("totalCount",    totalCount);
        model.addAttribute("activeCount",   activeCount);
        model.addAttribute("inactiveCount", inactiveCount);
        model.addAttribute("openCount",     openCount);
        model.addAttribute("closedCount",   closedCount);
        model.addAttribute("areaCount",     postalOfficeRepository.countDistinctAreasNonArchived());

        // For modal dropdowns and filters
        List<Area> visibleAreas = locationService.getAllAreas();
        if (!(roleId != null && (roleId == 1 || roleId == 4))) {
            visibleAreas = visibleAreas.stream()
                    .filter(a -> areaId != null && areaId.equals(a.getId()))
                    .collect(Collectors.toList());
        }
        model.addAttribute("areas",   visibleAreas);
        model.addAttribute("regions", locationService.getAllRegions());

        model.addAttribute("activePage",    "dashboard");
        model.addAttribute("isSystemAdmin", roleId != null && (roleId == 1 || roleId == 4));
        model.addAttribute("isAreaAdmin", roleId != null && roleId == 2);
        boolean isSrdOperation = roleId != null && roleId == 4;
        model.addAttribute("isSrdOperation", isSrdOperation);

        // Dashboard table actions (dashboard.js reads #dashboardRoleFlags)
        model.addAttribute("canDashboardEdit", roleId != null && !isSrdOperation);
        model.addAttribute("canDashboardArchive", roleId != null && (roleId == 1 || roleId == 2 || roleId == 4));

        // For edit modal JavaScript
        model.addAttribute("loggedInRoleId", roleId);
        model.addAttribute("loggedInAreaId", areaId);

        String assignedAreaName = null;
        if (roleId != null && roleId == 2 && areaId != null) {
            assignedAreaName = locationService.getAllAreas().stream()
                    .filter(a -> areaId.equals(a.getId()))
                    .findFirst()
                    .map(Area::getAreaName)
                    .orElse(null);
        }
        model.addAttribute("assignedAreaName", assignedAreaName);

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

        return dto;
    }
}