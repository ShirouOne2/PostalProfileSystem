package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Entity.Area;
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
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller for displaying postal offices in a data table.
 * - System Admin (role_id=1)  → sees ALL postal offices
 * - Area Admin   (role_id=2)  → sees only offices in their assigned area
 * - User         (role_id=3)  → sees only offices in their assigned area
 */
@Controller
@RequestMapping("/table")
public class DataTableController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private LocationHierarchyService locationService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public String viewPostOffices(Model model) {

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

        model.addAttribute("activePage",    "table");
        model.addAttribute("isSystemAdmin", roleId != null && (roleId == 1 || roleId == 4));
        model.addAttribute("isAreaAdmin", roleId != null && roleId == 2);
        model.addAttribute("userAreaId", areaId);

        return "table";
    }

    private java.util.Map<String, Object> convertToMapDTO(PostalOffice office) {
        java.util.Map<String, Object> dto = new java.util.HashMap<>();
        dto.put("id",               office.getId());
        dto.put("name",             office.getName());
        dto.put("address",          office.getAddress());
        dto.put("zipCode",          office.getZipCode());
        dto.put("postmaster",       office.getPostmaster());
        dto.put("noOfEmployees",    office.getNoOfEmployees());
        dto.put("latitude",         office.getLatitude());
        dto.put("longitude",        office.getLongitude());
        dto.put("connectionStatus", office.getConnectionStatus());
        dto.put("officeStatus",     office.getOfficeStatus());
        dto.put("speed",            office.getSpeed());
        dto.put("remarks",          office.getRemarks());

        // Area is EAGER — safe to access directly
        dto.put("area", office.getArea() != null ? office.getArea().getAreaName() : null);

        // LAZY associations — wrapped in try-catch to survive any
        // Hibernate proxy edge cases (e.g. uninitialized proxy after DISTINCT query).
        try { dto.put("region",   office.getRegion()           != null ? office.getRegion().getName()           : null); }
        catch (Exception e) { dto.put("region",   null); }

        try { dto.put("province", office.getProvince()         != null ? office.getProvince().getName()         : null); }
        catch (Exception e) { dto.put("province", null); }

        try { dto.put("cityMunicipality", office.getCityMunicipality() != null ? office.getCityMunicipality().getName() : null); }
        catch (Exception e) { dto.put("cityMunicipality", null); }

        try { dto.put("barangay", office.getBarangay()         != null ? office.getBarangay().getName()         : null); }
        catch (Exception e) { dto.put("barangay", null); }

        return dto;
    }
}