package com.pps.profilesystem.Service;

import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service to provide dashboard statistics for sidebar display
 * This service can be used across all controllers to provide consistent stats
 */
@Service
public class DashboardStatsService {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Get dashboard statistics for the current user
     * @return Map containing all dashboard statistics
     */
    public Map<String, Object> getDashboardStats() {
        // Get the logged-in user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User currentUser = userRepository.findByEmail(email).orElse(null);

        Integer roleId = currentUser != null ? currentUser.getRole()   : null;
        Integer areaId = currentUser != null ? currentUser.getAreaId() : null;

        // Fetch offices based on role
        List<PostalOffice> offices;

        if (roleId != null && roleId == 1) {
            // System Admin sees all offices
            offices = postalOfficeRepository.findAllNonArchivedWithConnectivity();
        } else {
            // Area Admin and User see only their area's offices
            offices = postalOfficeRepository.findAllNonArchivedWithConnectivity()
                .stream()
                .filter(po -> {
                    if (areaId == null) return false;
                    return po.getArea() != null && areaId.equals(po.getArea().getId());
                })
                .collect(Collectors.toList());
        }

        // Calculate statistics
        long totalCount    = offices.size();
        long activeCount   = offices.stream()
            .filter(po -> Boolean.TRUE.equals(po.getConnectionStatus())).count();
        long inactiveCount = totalCount - activeCount;
        long openCount     = offices.stream()
            .filter(po -> "OPEN".equalsIgnoreCase(po.getOfficeStatus())).count();
        long closedCount   = offices.stream()
            .filter(po -> "CLOSED".equalsIgnoreCase(po.getOfficeStatus())).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalCount", totalCount);
        stats.put("activeCount", activeCount);
        stats.put("inactiveCount", inactiveCount);
        stats.put("openCount", openCount);
        stats.put("closedCount", closedCount);
        stats.put("isSystemAdmin", roleId != null && roleId == 1);
        stats.put("isAreaAdmin", roleId != null && roleId == 2);

        return stats;
    }

    /**
     * Add dashboard statistics to the model
     * @param model Spring UI Model
     */
    public void addDashboardStatsToModel(org.springframework.ui.Model model) {
        try {
            Map<String, Object> stats = getDashboardStats();
            model.addAllAttributes(stats);
        } catch (Exception e) {
            // Add default values if there's an error
            model.addAttribute("totalCount", 0);
            model.addAttribute("activeCount", 0);
            model.addAttribute("inactiveCount", 0);
            model.addAttribute("openCount", 0);
            model.addAttribute("closedCount", 0);
            model.addAttribute("isSystemAdmin", false);
            model.addAttribute("isAreaAdmin", false);
        }
    }
}
