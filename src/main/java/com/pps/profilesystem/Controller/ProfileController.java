package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import org.springframework.beans.factory.annotation.Autowired;
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
        model.addAttribute("office",    office);
        model.addAttribute("postOffice", buildProfileData(office));
        model.addAttribute("activePage", "profile");
        model.addAttribute("canEdit",    true);
        model.addAttribute("canAccessAllAreas", true);
        model.addAttribute("source",    source);   // ← passed to Back button in profile.html

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
        model.addAttribute("office",    office);
        model.addAttribute("postOffice", buildProfileData(office));
        model.addAttribute("activePage", "profile");

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
}