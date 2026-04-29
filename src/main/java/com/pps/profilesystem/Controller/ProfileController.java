package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Repository.UserRepository;
import com.pps.profilesystem.Service.InventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Optional;

@Controller
public class ProfileController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InventoryService inventoryService;

    /**
     * View profile by ID - accessible via /profile/{id}
     * Optional ?source=table (default) or ?source=quarters
     */
    @GetMapping("/profile/{id}")
    @Transactional(readOnly = true)
    public String showProfile(@PathVariable Integer id,
                              @RequestParam(value = "source", defaultValue = "table") String source,
                              Model model) {
        Optional<PostalOffice> officeOptional = postalOfficeRepository.findById(id);
        if (officeOptional.isEmpty()) {
            return "redirect:/table";
        }

        PostalOffice office = officeOptional.get();

        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return "redirect:/login";
        }
        if (!canAccessProfileOffice(currentUser, office)) {
            return "redirect:/access-denied";
        }

        model.addAttribute("office",    office);
        model.addAttribute("postOffice", buildProfileData(office));
        model.addAttribute("inventoryList", inventoryService.getByPostalOfficeId(id));
        model.addAttribute("activePage", "profile");
        model.addAttribute("source",    source);
        addProfileActionFlags(model, currentUser);

        return "profile";
    }

    /**
     * View profile popup - accessible via /profile-popup/{id}
     * Uses profile-popup.html template for modern popup display
     */
    @GetMapping("/profile-popup/{id}")
    @Transactional(readOnly = true)
    public String showProfilePopup(@PathVariable Integer id, Model model) {
        Optional<PostalOffice> officeOptional = postalOfficeRepository.findById(id);
        if (officeOptional.isEmpty()) {
            return "redirect:/table";
        }

        PostalOffice office = officeOptional.get();

        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return "redirect:/login";
        }
        if (!canAccessProfileOffice(currentUser, office)) {
            return "redirect:/access-denied";
        }

        model.addAttribute("office",    office);
        model.addAttribute("postOffice", buildProfileData(office));
        model.addAttribute("inventoryList", inventoryService.getByPostalOfficeId(id));
        model.addAttribute("activePage", "profile");
        model.addAttribute("source", "table");
        addProfileActionFlags(model, currentUser);

        return "profile-popup";
    }

    /**
     * Alternative mapping - /postal-office/view/{id}
     */
    @GetMapping("/postal-office/view/{id}")
    @Transactional(readOnly = true)
    public String showProfileAlt(@PathVariable Integer id,
                                 @RequestParam(value = "source", defaultValue = "table") String source,
                                 Model model) {
        return showProfile(id, source, model);
    }

    /**
     * Handle legacy profile.html URL pattern - /profile.html?id=321
     */
    @GetMapping("/profile.html")
    @Transactional(readOnly = true)
    public String showProfileLegacy(@RequestParam("id") Integer id,
                                    @RequestParam(value = "source", defaultValue = "table") String source,
                                    Model model) {
        return showProfile(id, source, model);
    }

    private java.util.Map<String, Object> buildProfileData(PostalOffice office) {
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("id",           office.getId());
        data.put("postalOffice", office.getName());
        data.put("postmaster",   office.getPostmaster());
        data.put("area",         office.getArea()            != null ? office.getArea().getAreaName()         : null);
        data.put("region",       office.getRegion()          != null ? office.getRegion().getName()           : null);
        data.put("province",     office.getProvince()        != null ? office.getProvince().getName()         : null);
        data.put("city",         office.getCityMunicipality()!= null ? office.getCityMunicipality().getName() : null);
        data.put("barangay",     office.getBarangay()        != null ? office.getBarangay().getName()         : null);
        data.put("zipCode",      office.getZipCode());
        data.put("addressLine",  office.getAddress());
        data.put("latitude",     office.getLatitude());
        data.put("longitude",    office.getLongitude());
        data.put("connectivityStatus", office.getConnectionStatus() ? "Active" : "Inactive");
        data.put("status",             office.getConnectionStatus() ? "Active" : "Inactive");
        data.put("officeStatus",       office.getOfficeStatus());
        data.put("internetServiceProvider", office.getInternetServiceProvider());
        data.put("typeOfConnection",        office.getTypeOfConnection());
        data.put("speed",                   office.getSpeed());
        data.put("staticIpAddress",         office.getStaticIpAddress());
        data.put("classification",          office.getClassification());
        data.put("serviceProvided",         office.getServiceProvided());
        data.put("noOfEmployees",           office.getNoOfEmployees());
        data.put("noOfPostalTellers",       office.getNoOfPostalTellers());
        data.put("noOfLetterCarriers",      office.getNoOfLetterCarriers());
        data.put("postalOfficeContactPerson", office.getPostalOfficeContactPerson());
        data.put("postalOfficeContactNumber", office.getPostalOfficeContactNumber());
        data.put("ispContactPerson",          office.getIspContactPerson());
        data.put("ispContactNumber",          office.getIspContactNumber());
        data.put("remarks",                   office.getRemarks());

        com.pps.profilesystem.Entity.Connectivity conn = office.getActiveConnectivity();
        data.put("planName",      conn != null ? conn.getPlanName()      : null);
        data.put("planPrice",     conn != null ? conn.getPlanPrice()     : null);
        data.put("accountNumber", conn != null ? conn.getAccountNumber() : null);
        data.put("ownedOrShared", conn != null && conn.getIsShared() != null
                                    ? (conn.getIsShared() ? "Shared" : "Owned") : null);

        return data;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }

    /**
     * System admin (1) and SRD Operation (4) may open any office; others only offices in their area.
     */
    private boolean canAccessProfileOffice(User user, PostalOffice office) {
        Integer roleId = user.getRole();
        if (roleId == null) {
            return false;
        }
        if (roleId == 1 || roleId == 4) {
            return true;
        }
        Integer userAreaId = user.getAreaId();
        return office.getArea() != null && userAreaId != null && userAreaId.equals(office.getArea().getId());
    }

    private void addProfileActionFlags(Model model, User user) {
        Integer roleId = user.getRole();
        boolean isSrd = roleId != null && roleId == 4;
        model.addAttribute("canProfileEdit", roleId != null && !isSrd);
        model.addAttribute("canProfileArchive", roleId != null && (roleId == 1 || roleId == 2 || roleId == 4));
        model.addAttribute("canProfilePhotoUpload", roleId != null && !isSrd);
        model.addAttribute("canAccessAllAreas", roleId != null && (roleId == 1 || roleId == 4));
        model.addAttribute("canEdit", roleId != null && !isSrd);
    }
}