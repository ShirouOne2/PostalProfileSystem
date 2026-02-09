package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Service.PostalOfficeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.Optional;

/**
 * Controller for Post Office Profile View
 * Refactored to use services and remove inline DTOs
 */
@Controller
@RequestMapping("/profile")
public class ProfileController {

    @Autowired
    private PostalOfficeService postalOfficeService;

    /**
     * Display the profile page for a specific post office
     * @param id Post Office ID
     * @param model Spring MVC model
     * @return profile view name
     */
    @GetMapping("/{id}")
    public String showProfile(@PathVariable Integer id, Model model) {
        
        // Fetch post office using service
        Optional<PostalOffice> officeOptional = postalOfficeService.getPostalOfficeById(id);
        
        if (officeOptional.isEmpty()) {
            return "redirect:/table";
        }
        
        PostalOffice office = officeOptional.get();
        
        // Add office data directly to model
        model.addAttribute("office", office);
        
        // Build profile data as a Map for the view
        model.addAttribute("profileData", buildProfileData(office));
        model.addAttribute("activePage", "profile");
        
        // User access permissions
        model.addAttribute("canEdit", true);
        model.addAttribute("canAccessAllAreas", true);
        
        return "profile";
    }
    
    /**
     * Helper method to build profile data map from PostalOffice entity
     */
    private java.util.Map<String, Object> buildProfileData(PostalOffice office) {
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        
        data.put("id", office.getId());
        data.put("postalOffice", office.getName());
        data.put("postmaster", office.getPostmaster());
        data.put("area", office.getArea() != null ? office.getArea().getAreaName() : null);
        data.put("region", office.getRegion() != null ? office.getRegion().getName() : null);
        data.put("province", office.getProvince() != null ? office.getProvince().getName() : null);
        data.put("city", office.getCityMunicipality() != null ? office.getCityMunicipality().getName() : null);
        data.put("barangay", office.getBarangay() != null ? office.getBarangay().getName() : null);
        data.put("zipCode", office.getZipCode());
        data.put("addressLine", office.getAddress());
        data.put("latitude", office.getLatitude());
        data.put("longitude", office.getLongitude());
        data.put("connectivityStatus", office.getConnectionStatus() ? "Active" : "Inactive");
        data.put("status", office.getConnectionStatus() ? "Active" : "Inactive");
        data.put("internetServiceProvider", office.getInternetServiceProvider());
        
        return data;
    }
}