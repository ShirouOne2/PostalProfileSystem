package com.pps.profilesystem.Service;

import com.pps.profilesystem.Entity.Connectivity;
import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Repository.ConnectivityRepository;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ArchiveService
 *
 * Handles archiving and restoring of postal offices.
 * Archived offices are hidden from all normal views (table, map, dashboard)
 * but are never permanently deleted — they can always be restored.
 */
@Service
@Transactional
public class ArchiveService {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private ConnectivityRepository connectivityRepository;

    // ── Archive ──────────────────────────────────────────────────────────────

    /**
     * Archive a single postal office.
     * Also disconnects its active connectivity if present.
     */
    public PostalOffice archiveOffice(Integer id, String reason) {
        PostalOffice office = postalOfficeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Postal office not found with ID: " + id));

        if (Boolean.TRUE.equals(office.getIsArchived())) {
            throw new RuntimeException("Office is already archived.");
        }

        // Disconnect active connectivity before archiving
        if (Boolean.TRUE.equals(office.getConnectionStatus()) && office.getActiveConnectivity() != null) {
            Connectivity conn = office.getActiveConnectivity();
            conn.setDateDisconnected(LocalDateTime.now());
            connectivityRepository.save(conn);
            office.setActiveConnectivity(null);
            office.setConnectionStatus(false);
        }

        office.setIsArchived(true);
        office.setArchivedAt(LocalDateTime.now());
        office.setArchiveReason(reason != null ? reason.trim() : "No reason provided");

        return postalOfficeRepository.save(office);
    }

    /**
     * Bulk archive a list of postal offices.
     */
    public int bulkArchive(List<Integer> ids, String reason) {
        int count = 0;
        for (Integer id : ids) {
            try {
                archiveOffice(id, reason);
                count++;
            } catch (Exception ignored) {
                // Skip offices that fail (e.g. already archived)
            }
        }
        return count;
    }

    // ── Restore ──────────────────────────────────────────────────────────────

    /**
     * Restore a single archived office back to active inventory.
     */
    public PostalOffice restoreOffice(Integer id) {
        PostalOffice office = postalOfficeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Postal office not found with ID: " + id));

        if (!Boolean.TRUE.equals(office.getIsArchived())) {
            throw new RuntimeException("Office is not archived.");
        }

        office.setIsArchived(false);
        office.setArchivedAt(null);
        office.setArchiveReason(null);
        // Note: office remains inactive (connectionStatus = false) after restore.
        // Staff can re-activate it manually if needed.

        return postalOfficeRepository.save(office);
    }

    /**
     * Bulk restore a list of archived offices.
     */
    public int bulkRestore(List<Integer> ids) {
        int count = 0;
        for (Integer id : ids) {
            try {
                restoreOffice(id);
                count++;
            } catch (Exception ignored) {}
        }
        return count;
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    /**
     * Get all archived offices.
     */
    public List<PostalOffice> getAllArchivedOffices() {
        return postalOfficeRepository.findByIsArchivedTrue();
    }

    /**
     * Get all archived offices as map DTOs for the view.
     */
    public List<Map<String, Object>> getArchivedOfficesForTable() {
        return postalOfficeRepository.findByIsArchivedTrue()
            .stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    /**
     * Count archived offices.
     */
    public long getArchivedCount() {
        return postalOfficeRepository.countByIsArchivedTrue();
    }

    // ── DTO Helper ────────────────────────────────────────────────────────────

    private Map<String, Object> toDTO(PostalOffice po) {
        Map<String, Object> map = new HashMap<>();
        map.put("id",            po.getId());
        map.put("name",          po.getName());
        map.put("address",       po.getAddress());
        map.put("postmaster",    po.getPostmaster());
        map.put("areaName",      po.getArea()             != null ? po.getArea().getAreaName()                 : "N/A");
        map.put("cityName",      po.getCityMunicipality() != null ? po.getCityMunicipality().getName()         : "N/A");
        map.put("provinceName",  po.getProvince()         != null ? po.getProvince().getName()                 : "N/A");
        map.put("regionName",    po.getRegion()           != null ? po.getRegion().getName()             : "N/A");
        map.put("archivedAt",    po.getArchivedAt()       != null ? po.getArchivedAt().toString()              : null);
        map.put("archiveReason", po.getArchiveReason());
        return map;
    }
}