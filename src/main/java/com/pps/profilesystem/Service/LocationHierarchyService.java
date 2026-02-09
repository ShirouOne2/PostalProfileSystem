package com.pps.profilesystem.Service;

import com.pps.profilesystem.Entity.*;
import com.pps.profilesystem.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for handling location hierarchy (Region -> Province -> City -> Barangay)
 */
@Service
@Transactional(readOnly = true)
public class LocationHierarchyService {

    @Autowired
    private RegionsRepository regionsRepository;

    @Autowired
    private ProvinceRepository provinceRepository;

    @Autowired
    private CityMunicipalityRepository cityMunicipalityRepository;

    @Autowired
    private BarangayRepository barangayRepository;

    @Autowired
    private AreaRepository areaRepository;

    /**
     * Get all regions
     */
    public List<Regions> getAllRegions() {
        return regionsRepository.findAll();
    }

    /**
     * Get provinces by region ID
     */
    public List<Province> getProvincesByRegion(Integer regionId) {
        return provinceRepository.findByRegionId(regionId);
    }

    /**
     * Get cities/municipalities by province ID
     */
    public List<CityMunicipality> getCitiesByProvince(Integer provinceId) {
        return cityMunicipalityRepository.findByProvinceId(provinceId);
    }

    /**
     * Get barangays by city/municipality ID
     */
    public List<Barangay> getBarangaysByCity(Integer cityId) {
        return barangayRepository.findByCityMunicipalityId(cityId);
    }

    /**
     * Get all areas
     */
    public List<Area> getAllAreas() {
        return areaRepository.findAll();
    }
}