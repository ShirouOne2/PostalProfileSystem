package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Repository.AreaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.view.RedirectView;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Controller
public class UsersController {

    @Autowired
    private AreaRepository areaRepository;

    @GetMapping("/users")
    public String usersManagement(Model model) {
        model.addAttribute("activePage", "users");
        return "users-management";
    }

    @GetMapping("/register")
    public RedirectView register() {
        return new RedirectView("/users");
    }

    /**
     * ✅ Returns Area 1 to 9 for the User modal dropdown.
     * System Admin gets full access (no area restriction).
     * Area Admin / User gets assigned to a specific area.
     */
    @GetMapping("/api/areas")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getAllAreas() {
        List<Map<String, Object>> areas = new ArrayList<>();

        // Area 1 to 9 — hardcoded or fetched from DB
        areaRepository.findAll().forEach(area -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", area.getId());
            map.put("areaName", area.getAreaName());
            areas.add(map);
        });

        // Fallback: kung walang laman ang DB, hardcode 1-9
        if (areas.isEmpty()) {
            for (int i = 1; i <= 9; i++) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("id", i);
                map.put("areaName", "Area " + i);
                areas.add(map);
            }
        }

        return ResponseEntity.ok(areas);
    }
}