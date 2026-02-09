package com.pps.profilesystem.Controller;

import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@RestController
@RequestMapping("/api/quarters")  // Changed from "/quarters" to "/api/quarters"
public class QuartersApiController {

    @GetMapping("/export")
    public void exportReport(
            @RequestParam String type,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String areaFilter,
            @RequestParam(required = false) String quarterFilter,
            @RequestParam(required = false) String statusFilter,
            HttpServletResponse response) throws IOException {
        
        // Placeholder for export functionality
        response.setContentType("text/plain");
        response.getWriter().write("Export feature coming soon for type: " + type);
    }
}