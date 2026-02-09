package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Service.PostalOfficeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for map-related postal office data
 * Returns postal offices with coordinates for map visualization
 */
@RestController
@RequestMapping("/api")
public class MapController {

    @Autowired
    private PostalOfficeService postalOfficeService;

    /**
     * Get all post offices with their coordinates for map display
     * @return List of post offices as Map objects
     */
    @GetMapping("/post-offices")
    public List<Map<String, Object>> getPostOffices() {
        return postalOfficeService.getAllPostalOfficesForMap();
    }
}