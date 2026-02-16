package com.pps.profilesystem.Service;

import com.pps.profilesystem.Entity.*;
import com.pps.profilesystem.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class PostalOfficeService {

    @Autowired
    private PostalOfficeRepository postalOfficeRepository;

    @Autowired
    private ConnectivityRepository connectivityRepository;

    @Autowired
    private ProviderRepository providerRepository;

    /**
     * Get all postal offices
     */
    public List<PostalOffice> getAllPostalOffices() {
        return postalOfficeRepository.findAll();
    }

    /**
     * Get postal office by ID
     */
    public Optional<PostalOffice> getPostalOfficeById(Integer id) {
        return postalOfficeRepository.findById(id);
    }

    /**
     * Get all postal offices with area for map display
     */
    public List<Map<String, Object>> getAllPostalOfficesForMap() {
        return postalOfficeRepository.findAllWithAreaForMap()
            .stream()
            .map(this::convertToMapDTO)
            .collect(Collectors.toList());
    }

    /**
     * Get all postal offices for table display (includes those without coordinates)
     */
    public List<Map<String, Object>> getAllPostalOfficesForTable() {
        return postalOfficeRepository.findAll()
            .stream()
            .map(this::convertToMapDTO)
            .collect(Collectors.toList());
    }

    /**
     * Create new postal office (backward compatibility)
     */
    public PostalOffice createPostalOffice(PostalOffice postalOffice) {
        return postalOfficeRepository.save(postalOffice);
    }

    /**
     * Create new postal office with automatic connectivity tracking
     * â­ IMPROVED: Better handling of the bidirectional relationship
     */
    @Transactional
    public PostalOffice createPostalOfficeWithConnectivity(PostalOffice postalOffice) {
        // Step 1: Save the postal office WITHOUT connectivity_id first
        // This establishes the office ID which connectivity needs
        postalOffice.setActiveConnectivity(null); // Ensure it's null initially
        PostalOffice savedOffice = postalOfficeRepository.save(postalOffice);
        
        // Step 2: If the office is active, create and link a connectivity record
        if (Boolean.TRUE.equals(postalOffice.getConnectionStatus())) {
            Connectivity connectivity = createConnectivityRecord(savedOffice);
            
            // Step 3: Save the connectivity record (this sets connectivity.OfficeID)
            Connectivity savedConnectivity = connectivityRepository.save(connectivity);
            
            // Step 4: Link back to postal office (this sets office.connectivity_id)
            savedOffice.setActiveConnectivity(savedConnectivity);
            savedOffice = postalOfficeRepository.save(savedOffice);
        }
        
        return savedOffice;
    }

    /**
     * Update existing postal office
     * â­ IMPROVED: Better handling of connectivity status changes
     */
    @Transactional
    public PostalOffice updatePostalOffice(Integer id, PostalOffice updatedOffice) {
        Optional<PostalOffice> existing = postalOfficeRepository.findById(id);
        if (existing.isEmpty()) {
            throw new RuntimeException("Postal office not found with ID: " + id);
        }
        
        PostalOffice office = existing.get();
        Boolean oldStatus = office.getConnectionStatus();
        
        // Update fields
        updateOfficeFields(office, updatedOffice);
        
        Boolean newStatus = office.getConnectionStatus();
        
        // Handle connectivity status changes
        handleConnectivityStatusChange(office, oldStatus, newStatus);
        
        return postalOfficeRepository.save(office);
    }

    /**
     * â­ IMPROVED: Handle connectivity linking when status changes
     */
    private void handleConnectivityStatusChange(PostalOffice office, Boolean oldStatus, Boolean newStatus) {
        // Changed from inactive/null to active
        if (!Boolean.TRUE.equals(oldStatus) && Boolean.TRUE.equals(newStatus)) {
            // Create new connectivity record and link it
            Connectivity connectivity = createConnectivityRecord(office);
            Connectivity savedConnectivity = connectivityRepository.save(connectivity);
            office.setActiveConnectivity(savedConnectivity);
        }
        // Changed from active to inactive
        else if (Boolean.TRUE.equals(oldStatus) && !Boolean.TRUE.equals(newStatus)) {
            // Disconnect current connectivity record
            if (office.getActiveConnectivity() != null) {
                Connectivity conn = office.getActiveConnectivity();
                conn.setDateDisconnected(LocalDateTime.now());
                connectivityRepository.save(conn);
                
                // Unlink from postal office
                office.setActiveConnectivity(null);
            }
        }
    }

    /**
     * Helper method to create a new connectivity record
     */
    private Connectivity createConnectivityRecord(PostalOffice office) {
        // Get default or first provider
        Provider defaultProvider = providerRepository.findAll().stream()
            .findFirst()
            .orElseGet(() -> {
                Provider newProvider = new Provider();
                newProvider.setName("Default Provider");
                return providerRepository.save(newProvider);
            });
        
        Connectivity connectivity = new Connectivity();
        connectivity.setPostalOffice(office);  // Sets OfficeID
        connectivity.setProvider(defaultProvider);
        connectivity.setDateConnected(LocalDateTime.now());
        // dateDisconnected is null for active connections
        
        return connectivity;
    }

    /**
     * Delete postal office by ID
     */
    public void deletePostalOffice(Integer id) {
        if (!postalOfficeRepository.existsById(id)) {
            throw new RuntimeException("Postal office not found with ID: " + id);
        }
        postalOfficeRepository.deleteById(id);
    }

    /**
     * Bulk delete postal offices
     */
    public int bulkDeletePostalOffices(List<Integer> ids) {
        int existingCount = 0;
        for (Integer id : ids) {
            if (postalOfficeRepository.existsById(id)) {
                existingCount++;
            }
        }
        postalOfficeRepository.deleteAllById(ids);
        return existingCount;
    }

    /**
     * Soft delete - mark as inactive and disconnect
     * â­ IMPROVED: Better handling of connectivity unlinking
     */
    @Transactional
    public PostalOffice softDeletePostalOffice(Integer id) {
        Optional<PostalOffice> officeOpt = postalOfficeRepository.findById(id);
        if (officeOpt.isEmpty()) {
            throw new RuntimeException("Postal office not found with ID: " + id);
        }
        
        PostalOffice office = officeOpt.get();
        office.setConnectionStatus(false);
        
        // Disconnect and unlink active connectivity
        if (office.getActiveConnectivity() != null) {
            Connectivity conn = office.getActiveConnectivity();
            conn.setDateDisconnected(LocalDateTime.now());
            connectivityRepository.save(conn);
            office.setActiveConnectivity(null);
        }
        
        return postalOfficeRepository.save(office);
    }

    /**
     * Get counts
     */
    public long getTotalCount() {
        return postalOfficeRepository.count();
    }

    public long getActiveCount() {
        return postalOfficeRepository.countByConnectionStatus(true);
    }

    public long getInactiveCount() {
        return postalOfficeRepository.countByConnectionStatus(false);
    }

    public long getDistinctAreasCount() {
        return postalOfficeRepository.countDistinctAreas();
    }

    /**
     * Find by connection status
     */
    public List<PostalOffice> findByConnectionStatus(Boolean status) {
        return postalOfficeRepository.findByConnectionStatus(status);
    }

    /**
     * Search by name
     */
    public List<PostalOffice> searchByName(String name) {
        return postalOfficeRepository.findByNameContainingIgnoreCase(name);
    }

    /**
     * Find by city
     */
    public List<PostalOffice> findByCityMunicipality(Integer cityId) {
        return postalOfficeRepository.findByCityMunicipalityId(cityId);
    }

    // ========== NEW: Connectivity-Specific Methods ==========

    /**
     * Get connectivity history for a postal office
     */
    public List<Connectivity> getConnectivityHistory(Integer officeId) {
        return connectivityRepository.findByOfficeIdOrderByDateConnectedDesc(officeId);
    }

    /**
     * Get current active connectivity for a postal office
     */
    public Optional<Connectivity> getActiveConnectivity(Integer officeId) {
        Optional<PostalOffice> office = postalOfficeRepository.findById(officeId);
        if (office.isPresent() && office.get().getActiveConnectivity() != null) {
            return Optional.of(office.get().getActiveConnectivity());
        }
        return Optional.empty();
    }

    /**
     * Switch provider for an active office
     */
    @Transactional
    public PostalOffice switchProvider(Integer officeId, Integer newProviderId) {
        Optional<PostalOffice> officeOpt = postalOfficeRepository.findById(officeId);
        if (officeOpt.isEmpty()) {
            throw new RuntimeException("Postal office not found with ID: " + officeId);
        }

        PostalOffice office = officeOpt.get();
        
        // Disconnect old provider
        if (office.getActiveConnectivity() != null) {
            Connectivity oldConn = office.getActiveConnectivity();
            oldConn.setDateDisconnected(LocalDateTime.now());
            connectivityRepository.save(oldConn);
        }

        // Connect new provider
        Optional<Provider> providerOpt = providerRepository.findById(newProviderId);
        if (providerOpt.isEmpty()) {
           throw new RuntimeException("Provider not found with ID: " + newProviderId);
        }

        Connectivity newConn = new Connectivity();
        newConn.setPostalOffice(office);
        newConn.setProvider(providerOpt.get());
        newConn.setDateConnected(LocalDateTime.now());
        Connectivity savedConn = connectivityRepository.save(newConn);
        office.setActiveConnectivity(savedConn);
        office.setConnectionStatus(true);
        
        return office;
    }

    /**
     * Convert PostalOffice entity to Map for API response
     */
    private Map<String, Object> convertToMapDTO(PostalOffice po) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", po.getId());
        map.put("name", po.getName());
        map.put("lat", po.getLatitude());
        map.put("lng", po.getLongitude());
        map.put("status", po.getConnectionStatus() != null ? po.getConnectionStatus() : false);
        map.put("areaId", po.getArea() != null ? po.getArea().getId() : null);
        map.put("address", po.getAddress());
        map.put("postmaster", po.getPostmaster());
        map.put("zipCode", po.getZipCode());
        map.put("speed", po.getSpeed());
        map.put("isp", po.getInternetServiceProvider());
        map.put("noOfEmployees", po.getNoOfEmployees());
        map.put("postalOfficeContactPerson", po.getPostalOfficeContactPerson());
        map.put("postalOfficeContactNumber", po.getPostalOfficeContactNumber());
        return map;
    }

    /**
     * Update office fields from another office object
     */
    private void updateOfficeFields(PostalOffice target, PostalOffice source) {
        if (source.getName() != null) target.setName(source.getName());
        if (source.getPostmaster() != null) target.setPostmaster(source.getPostmaster());
        if (source.getAddress() != null) target.setAddress(source.getAddress());
        if (source.getZipCode() != null) target.setZipCode(source.getZipCode());
        if (source.getArea() != null) target.setArea(source.getArea());
        if (source.getRegion() != null) target.setRegion(source.getRegion());
        if (source.getProvince() != null) target.setProvince(source.getProvince());
        if (source.getCityMunicipality() != null) target.setCityMunicipality(source.getCityMunicipality());
        if (source.getBarangay() != null) target.setBarangay(source.getBarangay());
        if (source.getLatitude() != null) target.setLatitude(source.getLatitude());
        if (source.getLongitude() != null) target.setLongitude(source.getLongitude());
        if (source.getConnectionStatus() != null) target.setConnectionStatus(source.getConnectionStatus());
        if (source.getInternetServiceProvider() != null) target.setInternetServiceProvider(source.getInternetServiceProvider());
    }
}