package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Repository.PostalOfficeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class MapController {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @GetMapping("/post-offices")
    public List<Map<String, Object>> getPostOffices() {
        return postalOfficeRepository.findAll()
            .stream()
            .filter(po -> po.getLatitude() != null && po.getLongitude() != null)
            .map(po -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", po.getId());
                m.put("name", po.getName());
                m.put("lat", po.getLatitude());
                m.put("lng", po.getLongitude());
                m.put("status", po.getConnectionStatus());
                m.put("areaId", po.getArea().getId());
                return m;
            })
            .toList();
    }

}