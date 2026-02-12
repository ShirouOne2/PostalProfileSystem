package com.pps.profilesystem.Service;

import com.pps.profilesystem.Entity.*;
import com.pps.profilesystem.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private AreaRepository areaRepository;

    @Autowired
    private RegionsRepository regionsRepository;

    @Autowired
    private ProvinceRepository provinceRepository;

    @Autowired
    private CityMunicipalityRepository cityMunicipalityRepository;

    @Autowired
    private BarangayRepository barangayRepository;

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
     * Create new postal office
     */
    public PostalOffice createPostalOffice(PostalOffice postalOffice) {
        return postalOfficeRepository.save(postalOffice);
    }

    /**
     * Update existing postal office
     */
    public PostalOffice updatePostalOffice(Integer id, PostalOffice updatedOffice) {
        Optional<PostalOffice> existing = postalOfficeRepository.findById(id);
        if (existing.isEmpty()) {
            throw new RuntimeException("Postal office not found with ID: " + id);
        }
        
        PostalOffice office = existing.get();
        updateOfficeFields(office, updatedOffice);
        return postalOfficeRepository.save(office);
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
     * Soft delete - mark as inactive
     */
    public PostalOffice softDeletePostalOffice(Integer id) {
        Optional<PostalOffice> officeOpt = postalOfficeRepository.findById(id);
        if (officeOpt.isEmpty()) {
            throw new RuntimeException("Postal office not found with ID: " + id);
        }
        
        PostalOffice office = officeOpt.get();
        office.setConnectionStatus(false);
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

    // ========== Helper Methods ==========

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
        map.put("isp", po.getInternetServiceProvider());
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