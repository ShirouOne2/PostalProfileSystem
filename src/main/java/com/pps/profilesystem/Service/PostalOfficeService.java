package com.pps.profilesystem.Service;

import com.pps.profilesystem.Entity.*;
import com.pps.profilesystem.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Month;
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

    @Autowired
    private UserRepository userRepository;

    /**
     * Get all postal offices (non-archived only)
     * Filtered by user's area if not admin
     */
    public List<PostalOffice> getAllPostalOffices() {
        Integer userAreaId = getCurrentUserAreaId();
        if (userAreaId == null) {
            // Admin or no area restriction — use optimized query (fixes N+1 slow loading)
            return postalOfficeRepository.findByIsArchivedFalseWithDetails();
        } else {
            // Filter by user's area — use optimized query then filter
            return postalOfficeRepository.findByIsArchivedFalseWithDetails().stream()
                .filter(office -> office.getArea() != null && office.getArea().getId().equals(userAreaId))
                .collect(Collectors.toList());
        }
    }

    /**
     * Get postal office by ID
     */
    public Optional<PostalOffice> getPostalOfficeById(Integer id) {
        return postalOfficeRepository.findById(id);
    }

    /**
     * Get all postal offices for map display (non-archived only)
     * Filtered by user's area if not admin
     */
    public List<Map<String, Object>> getAllPostalOfficesForMap() {
        List<PostalOffice> offices = getAllPostalOffices();
        return offices.stream()
            .map(this::convertToMapDTO)
            .collect(Collectors.toList());
    }

    /**
     * Get all postal offices for table display (non-archived only)
     * Filtered by user's area if not admin
     */
    public List<Map<String, Object>> getAllPostalOfficesForTable() {
        List<PostalOffice> offices = getAllPostalOffices();
        return offices.stream()
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
     * Get counts filtered by user's area if not admin
     */
    public long getTotalCount() {
        Integer userAreaId = getCurrentUserAreaId();
        if (userAreaId == null) {
            return postalOfficeRepository.count() - postalOfficeRepository.countByIsArchivedTrue();
        } else {
            return postalOfficeRepository.findByIsArchivedFalse().stream()
                .filter(office -> office.getArea() != null && office.getArea().getId().equals(userAreaId))
                .count();
        }
    }

    public long getActiveCount() {
        Integer userAreaId = getCurrentUserAreaId();
        if (userAreaId == null) {
            return postalOfficeRepository.countByConnectionStatusAndIsArchivedFalse(true);
        } else {
            return postalOfficeRepository.findByIsArchivedFalse().stream()
                .filter(office -> office.getArea() != null && office.getArea().getId().equals(userAreaId))
                .filter(office -> Boolean.TRUE.equals(office.getConnectionStatus()))
                .count();
        }
    }

    public long getInactiveCount() {
        Integer userAreaId = getCurrentUserAreaId();
        if (userAreaId == null) {
            return postalOfficeRepository.countByConnectionStatusAndIsArchivedFalse(false);
        } else {
            return postalOfficeRepository.findByIsArchivedFalse().stream()
                .filter(office -> office.getArea() != null && office.getArea().getId().equals(userAreaId))
                .filter(office -> !Boolean.TRUE.equals(office.getConnectionStatus()))
                .count();
        }
    }

    public long getDistinctAreasCount() {
        Integer userAreaId = getCurrentUserAreaId();
        if (userAreaId == null) {
            return postalOfficeRepository.countDistinctAreasNonArchived();
        } else {
            // For non-admin users, they only see their assigned area
            return 1L;
        }
    }

    /**
     * Find by connection status (non-archived only)
     */
    public List<PostalOffice> findByConnectionStatus(Boolean status) {
        Integer userAreaId = getCurrentUserAreaId();
        if (userAreaId == null) {
            return postalOfficeRepository.findByConnectionStatus(status).stream()
                .filter(office -> !Boolean.TRUE.equals(office.getIsArchived()))
                .collect(Collectors.toList());
        } else {
            return postalOfficeRepository.findByConnectionStatus(status).stream()
                .filter(office -> office.getArea() != null && office.getArea().getId().equals(userAreaId))
                .filter(office -> !Boolean.TRUE.equals(office.getIsArchived()))
                .collect(Collectors.toList());
        }
    }

    /**
     * Search by name (non-archived only)
     */
    public List<PostalOffice> searchByName(String name) {
        Integer userAreaId = getCurrentUserAreaId();
        if (userAreaId == null) {
            return postalOfficeRepository.findByNameContainingIgnoreCase(name).stream()
                .filter(office -> !Boolean.TRUE.equals(office.getIsArchived()))
                .collect(Collectors.toList());
        } else {
            return postalOfficeRepository.findByNameContainingIgnoreCase(name).stream()
                .filter(office -> office.getArea() != null && office.getArea().getId().equals(userAreaId))
                .filter(office -> !Boolean.TRUE.equals(office.getIsArchived()))
                .collect(Collectors.toList());
        }
    }

    /**
     * Find by city (non-archived only)
     */
    public List<PostalOffice> findByCityMunicipality(Integer cityId) {
        Integer userAreaId = getCurrentUserAreaId();
        if (userAreaId == null) {
            return postalOfficeRepository.findByCityMunicipalityId(cityId).stream()
                .filter(office -> !Boolean.TRUE.equals(office.getIsArchived()))
                .collect(Collectors.toList());
        } else {
            return postalOfficeRepository.findByCityMunicipalityId(cityId).stream()
                .filter(office -> office.getArea() != null && office.getArea().getId().equals(userAreaId))
                .filter(office -> !Boolean.TRUE.equals(office.getIsArchived()))
                .collect(Collectors.toList());
        }
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
     * Get post offices filtered by date range and type
     * @param startDate Start date for filtering
     * @param endDate End date for filtering
     * @param dateType Type of date to filter by ("connected" or "disconnected")
     * @param statusFilter Additional status filter (includes "newly_connected" and "newly_disconnected")
     * @return List of filtered post offices
     */
    public List<Map<String, Object>> getPostOfficesByDateRange(
            LocalDateTime startDate, 
            LocalDateTime endDate, 
            String dateType, 
            String statusFilter) {
        
        List<PostalOffice> offices;
        
        // Handle newly connected/disconnected status filters
        if ("newly_connected".equals(statusFilter)) {
            // Filter by connection date — non-archived only (handled in repo query)
            offices = postalOfficeRepository.findByDateConnectedBetween(startDate, endDate);
        } else if ("newly_disconnected".equals(statusFilter)) {
            // Filter by disconnection date — non-archived only (handled in repo query)
            offices = postalOfficeRepository.findByDateDisconnectedBetween(startDate, endDate);
        } else if ("connected".equals(dateType)) {
            offices = postalOfficeRepository.findByDateConnectedBetween(startDate, endDate);
        } else if ("disconnected".equals(dateType)) {
            offices = postalOfficeRepository.findByDateDisconnectedBetween(startDate, endDate);
        } else {
            offices = postalOfficeRepository.findByIsArchivedFalse();
        }
        
        // Always exclude archived offices as a safety net
        offices = offices.stream()
            .filter(office -> !Boolean.TRUE.equals(office.getIsArchived()))
            .collect(Collectors.toList());
        
        // Apply additional status filter if specified (but not newly_connected/disconnected which are already handled)
        if ("active".equals(statusFilter)) {
            offices = offices.stream()
                .filter(office -> Boolean.TRUE.equals(office.getConnectionStatus()))
                .collect(Collectors.toList());
        } else if ("inactive".equals(statusFilter)) {
            offices = offices.stream()
                .filter(office -> !Boolean.TRUE.equals(office.getConnectionStatus()))
                .collect(Collectors.toList());
        }
        
        // Filter by user's area if not admin
        Integer userAreaId = getCurrentUserAreaId();
        if (userAreaId != null) {
            offices = offices.stream()
                .filter(office -> office.getArea() != null && office.getArea().getId().equals(userAreaId))
                .collect(Collectors.toList());
        }
        
        return offices.stream()
            .map(this::convertToMapDTO)
            .collect(Collectors.toList());
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
        
        // Add newThisQuarter flag if the office has connectivity data
        boolean newThisQuarter = isNewThisQuarter(po);
        map.put("newThisQuarter", newThisQuarter);
        
        return map;
    }
    
    /**
     * Check if the office was newly connected or disconnected in the current quarter
     */
    private boolean isNewThisQuarter(PostalOffice po) {
        if (po.getActiveConnectivity() == null) {
            return false;
        }
        
        LocalDateTime now = LocalDateTime.now();
        int currentYear = now.getYear();
        int currentQuarter = (now.getMonthValue() - 1) / 3 + 1;
        
        LocalDateTime[] quarterDates = getQuarterDateRange(currentYear, currentQuarter);
        LocalDateTime quarterStart = quarterDates[0];
        LocalDateTime quarterEnd = quarterDates[1];
        
        Connectivity connectivity = po.getActiveConnectivity();
        
        // Check if connected this quarter
        if (connectivity.getDateConnected() != null && 
            !connectivity.getDateConnected().isBefore(quarterStart) && 
            !connectivity.getDateConnected().isAfter(quarterEnd)) {
            return true;
        }
        
        // Check if disconnected this quarter
        if (connectivity.getDateDisconnected() != null && 
            !connectivity.getDateDisconnected().isBefore(quarterStart) && 
            !connectivity.getDateDisconnected().isAfter(quarterEnd)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Helper method to get the date range for a specific quarter
     */
    private LocalDateTime[] getQuarterDateRange(int year, int quarter) {
        Month startMonth;
        Month endMonth;

        switch (quarter) {
            case 1:
                startMonth = Month.JANUARY;
                endMonth = Month.MARCH;
                break;
            case 2:
                startMonth = Month.APRIL;
                endMonth = Month.JUNE;
                break;
            case 3:
                startMonth = Month.JULY;
                endMonth = Month.SEPTEMBER;
                break;
            case 4:
                startMonth = Month.OCTOBER;
                endMonth = Month.DECEMBER;
                break;
            default:
                throw new IllegalArgumentException("Quarter must be 1-4");
        }

        LocalDateTime start = LocalDateTime.of(year, startMonth, 1, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(year, endMonth, endMonth.length(isLeapYear(year)), 23, 59, 59);

        return new LocalDateTime[]{start, end};
    }
    
    private boolean isLeapYear(int year) {
        return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    }

    /**
     * Get current user's area ID
     * Returns null for admin users (no area restriction)
     */
    private Integer getCurrentUserAreaId() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return null;
            }
            
            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                // Admin (role 1) can see all areas
                if (user.getRole() != null && user.getRole() == 1) {
                    return null; // No area restriction for admin
                }
                return user.getAreaId(); // Return assigned area for non-admin users
            }
        } catch (Exception e) {
            // Log error but don't break the application
            System.err.println("Error getting current user area: " + e.getMessage());
        }
        return null;
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
    
    /**
     * Get current user information for UI display
     */
    public Map<String, Object> getCurrentUserInfo() {
        Map<String, Object> userInfo = new HashMap<>();
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                String email = authentication.getName();
                Optional<User> userOpt = userRepository.findByEmail(email);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    userInfo.put("email", user.getEmail());
                    userInfo.put("role", user.getRole());
                    userInfo.put("areaId", user.getAreaId());
                    userInfo.put("canAccessAllAreas", user.getRole() != null && user.getRole() == 1);
                }
            }
        } catch (Exception e) {
            System.err.println("Error getting current user info: " + e.getMessage());
        }
        return userInfo;
    }

    /**
     * Get current user entity
     */
    public User getCurrentUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                String email = authentication.getName();
                Optional<User> userOpt = userRepository.findByEmail(email);
                return userOpt.orElse(null);
            }
        } catch (Exception e) {
            System.err.println("Error getting current user: " + e.getMessage());
        }
        return null;
    }
}