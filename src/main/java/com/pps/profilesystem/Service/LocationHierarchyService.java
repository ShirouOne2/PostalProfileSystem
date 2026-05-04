package com.pps.profilesystem.Service;

import com.pps.profilesystem.Entity.*;
import com.pps.profilesystem.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Service for handling location hierarchy (Area → Province → City → Barangay).
 *
 * Region is no longer exposed to the Insert wizard UI.
 * Province dropdowns are driven by Area selection using the
 * AREA_PROVINCE_MAP below, which lists every province name
 * exactly as stored in the `provinces` DB table.
 */
@Service
@Transactional(readOnly = true)
public class LocationHierarchyService {

    @Autowired private RegionsRepository          regionsRepository;
    @Autowired private ProvinceRepository         provinceRepository;
    @Autowired private CityMunicipalityRepository cityMunicipalityRepository;
    @Autowired private BarangayRepository         barangayRepository;
    @Autowired private AreaRepository             areaRepository;

    // ── Area → Province name mapping ─────────────────────────────────────────
    // Keys  = area.id  (matches the `area` table primary key)
    // Values = province names EXACTLY as stored in the `provinces` table
    // (case-insensitive lookup is used, so casing here doesn't matter,
    //  but keep it matching DB values for clarity)
    private static final Map<Integer, List<String>> AREA_PROVINCE_MAP = new LinkedHashMap<>();
    static {
        // Area 1 — Cagayan Valley / Cordillera (northern Luzon)
        AREA_PROVINCE_MAP.put(1, Arrays.asList(
                "Apayao",
                "Ifugao",
                "Kalinga",
                "Cagayan",
                "Isabela",
                "Nueva Ecija",
                "Quirino"
        ));

        // Area 2 — Ilocos / CAR / Central Luzon (mix)
        AREA_PROVINCE_MAP.put(2, Arrays.asList(
                "Abra",
                "Benguet",
                "Mountain Province",
                "Ilocos Norte",
                "La Union",
                "Pangasinan",
                "Ilocos Sur",
                "Pampanga",
                "Tarlac"
        ));

        // Area 3 — NCR + surrounding
        AREA_PROVINCE_MAP.put(3, Arrays.asList(
                "Metro Manila",
                "Batanes",
                "Bulacan",
                "Cavite",
                "Palawan",
                "Rizal"
        ));

        // Area 4 — Bicol + MIMAROPA
        AREA_PROVINCE_MAP.put(4, Arrays.asList(
                "Albay",
                "Batangas",
                "Camarines Norte",
                "Camarines Sur",
                "Catanduanes",
                "Laguna",
                "Marinduque",
                "Masbate",
                "Occidental Mindoro",
                "Oriental Mindoro",
                "Quezon",
                "Romblon",
                "Sorsogon"
        ));

        // Area 5 — Eastern Visayas + Bohol/Cebu
        AREA_PROVINCE_MAP.put(5, Arrays.asList(
                "Southern Leyte",
                "Bohol",
                "Cebu",
                "Biliran",
                "Leyte",
                "Eastern Samar",
                "Northern Samar",
                "Samar"          // Western Samar is stored as "Samar" in most PH DBs
        ));

        // Area 6 — Western Visayas
        AREA_PROVINCE_MAP.put(6, Arrays.asList(
                "Aklan",
                "Antique",
                "Capiz",
                "Guimaras",
                "Iloilo",
                "Negros Occidental",
                "Negros Oriental",
                "Siquijor"
        ));

        // Area 7 — Davao + SOCCSKSARGEN + part of Caraga
        AREA_PROVINCE_MAP.put(7, Arrays.asList(
                "Davao de Oro",
                "Davao del Norte",
                "Davao del Sur",
                "Davao Occidental",
                "Davao Oriental",
                "Cotabato",          // North Cotabato is often stored as "Cotabato"
                "Sarangani",
                "South Cotabato",
                "Surigao del Sur",
                "Maguindanao",
                "Sultan Kudarat"
        ));

        // Area 8 — Northern Mindanao + Caraga
        AREA_PROVINCE_MAP.put(8, Arrays.asList(
                "Bukidnon",
                "Camiguin",
                "Lanao del Norte",
                "Misamis Oriental",
                "Dinagat Islands",
                "Agusan del Norte",
                "Agusan del Sur",
                "Surigao del Norte",
                "Lanao del Sur"
        ));

        // Area 9 — Zamboanga Peninsula + BARMM
        AREA_PROVINCE_MAP.put(9, Arrays.asList(
                "Basilan",
                "Sulu",
                "Tawi-Tawi",
                "Misamis Occidental",
                "Zamboanga del Norte",
                "Zamboanga del Sur",
                "Zamboanga Sibugay"
        ));
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** All regions (kept for import service & edit modal). */
    public List<Regions> getAllRegions() {
        return regionsRepository.findAll();
    }

    /** Provinces by region ID — kept for import service & edit modal. */
    public List<Province> getProvincesByRegion(Integer regionId) {
        return provinceRepository.findByRegionsId(regionId);
    }

    /**
     * Provinces for a given area ID, looked up by name from AREA_PROVINCE_MAP.
     * Results are ordered to match the map insertion order (alphabetical within area).
     *
     * Falls back to an empty list if the area ID is unknown or has no mapping.
     */
    public List<Province> getProvincesByArea(Integer areaId) {
        if (areaId == null) return List.of();

        List<String> provinceNames = AREA_PROVINCE_MAP.get(areaId);
        if (provinceNames == null || provinceNames.isEmpty()) return List.of();

        // Fetch all matching provinces in one DB query (case-insensitive)
        List<Province> found = provinceRepository.findByNameInIgnoreCase(provinceNames);

        // Re-sort to match the declared order in the map
        Map<String, Integer> orderIndex = new HashMap<>();
        for (int i = 0; i < provinceNames.size(); i++) {
            orderIndex.put(provinceNames.get(i).toLowerCase(), i);
        }
        found.sort(Comparator.comparingInt(p ->
                orderIndex.getOrDefault(p.getName().toLowerCase(), Integer.MAX_VALUE)));

        return found;
    }

    /** Cities/municipalities by province ID. */
    public List<CityMunicipality> getCitiesByProvince(Integer provinceId) {
        return cityMunicipalityRepository.findByProvinceId(provinceId);
    }

    /** Barangays by city/municipality ID. */
    public List<Barangay> getBarangaysByCity(Integer cityId) {
        return barangayRepository.findByCityMunicipalityId(cityId);
    }

    /** All areas. */
    public List<Area> getAllAreas() {
        return areaRepository.findAll();
    }
}