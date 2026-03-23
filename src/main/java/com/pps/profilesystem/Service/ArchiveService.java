package com.pps.profilesystem.Service;

import com.pps.profilesystem.Entity.ArchivedOffice;
import com.pps.profilesystem.Entity.Connectivity;
import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Repository.ArchivedOfficeRepository;
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

    @Autowired
    private ArchivedOfficeRepository archivedOfficeRepository;

    // ── Archive ──────────────────────────────────────────────────────────────

    /**
     * Archive a single postal office.
     * Also disconnects its active connectivity if present.
     */
    public PostalOffice archiveOffice(Integer id, String reason) {
        PostalOffice office = postalOfficeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Postal office not found with ID: " + id));

        // Check if already archived using ArchivedOffice entity
        if (archivedOfficeRepository.existsByPostalOfficeId(id)) {
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

        // Create archived record
        ArchivedOffice archivedOffice = new ArchivedOffice();
        archivedOffice.setPostalOffice(office);
        archivedOffice.setArchivedAt(LocalDateTime.now());
        archivedOffice.setArchiveReason(reason != null ? reason.trim() : "No reason provided");
        archivedOfficeRepository.save(archivedOffice);

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

        // Find and delete the archived record
        ArchivedOffice archivedOffice = archivedOfficeRepository.findByPostalOfficeId(id)
            .orElseThrow(() -> new RuntimeException("Office is not archived."));

        archivedOfficeRepository.delete(archivedOffice);

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
     * Get all archived offices — used by System Admin (sees everything).
     */
    public List<PostalOffice> getAllArchivedOffices() {
        // Find all archived records and get their postal offices
        return archivedOfficeRepository.findAll()
            .stream()
            .map(ArchivedOffice::getPostalOffice)
            .collect(Collectors.toList());
    }

    /**
     * Get archived offices filtered by area — used by Area Admin.
     */
    public List<PostalOffice> getArchivedOfficesByArea(Integer areaId) {
        // Find archived records for this area and get their postal offices
        return archivedOfficeRepository.findAllWithOfficeByArea(areaId)
            .stream()
            .map(ArchivedOffice::getPostalOffice)
            .collect(Collectors.toList());
    }

    /**
     * Get total count of archived offices — used by System Admin.
     */
    public long getArchivedCount() {
        return archivedOfficeRepository.count();
    }

    /**
     * Get all archived offices as map DTOs for the view.
     */
    public List<Map<String, Object>> getArchivedOfficesForTable() {
        return archivedOfficeRepository.findAll()
            .stream()
            .map(this::archivedOfficeToDTO)
            .collect(Collectors.toList());
    }

    private Map<String, Object> archivedOfficeToDTO(ArchivedOffice archivedOffice) {
        PostalOffice po = archivedOffice.getPostalOffice();
        Map<String, Object> map = new HashMap<>();
        map.put("id",            po.getId());
        map.put("name",          po.getName());
        map.put("address",       po.getAddress());
        map.put("postmaster",    po.getPostmaster());
        map.put("areaName",      po.getArea()             != null ? po.getArea().getAreaName()                 : "N/A");
        map.put("cityName",      po.getCityMunicipality() != null ? po.getCityMunicipality().getName()         : "N/A");
        map.put("provinceName",  po.getProvince()         != null ? po.getProvince().getName()                 : "N/A");
        map.put("regionName",    po.getRegion()           != null ? po.getRegion().getName()             : "N/A");
        map.put("archivedAt",    archivedOffice.getArchivedAt()       != null ? archivedOffice.getArchivedAt().toString()              : null);
        map.put("archiveReason", archivedOffice.getArchiveReason());
        return map;
    }
}