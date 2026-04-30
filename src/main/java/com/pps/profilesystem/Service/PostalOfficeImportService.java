package com.pps.profilesystem.Service;

import com.pps.profilesystem.DTO.PostalOfficeImportDTO;
import com.pps.profilesystem.Entity.*;
import com.pps.profilesystem.Repository.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@Transactional
public class PostalOfficeImportService {

    @Autowired private PostalOfficeRepository      postalOfficeRepository;
    @Autowired private AreaRepository              areaRepository;
    @Autowired private RegionsRepository           regionsRepository;
    @Autowired private ProvinceRepository          provinceRepository;
    @Autowired private CityMunicipalityRepository  cityMunicipalityRepository;
    @Autowired private BarangayRepository          barangayRepository;
    @Autowired private ConnectivityRepository      connectivityRepository;
    @Autowired private ProviderRepository          providerRepository;
    @Autowired private ZipCodeRepository           zipCodeRepository;

    // ── Region alias map ──────────────────────────────────────────────────────
    // Keys   = normalized (lowercase, trimmed) values that may appear in Excel
    // Values = EXACT name stored in the `regions` DB table
    private static final Map<String, String> REGION_ALIASES = new HashMap<>();
    static {
        // ── Region I ─────────────────────────────────────────────────────────
        String R1 = "Region I (Ilocos Region)";
        REGION_ALIASES.put("1",                    R1);
        REGION_ALIASES.put("i",                    R1);
        REGION_ALIASES.put("region i",             R1);
        REGION_ALIASES.put("region 1",             R1);
        REGION_ALIASES.put("ilocos region",        R1);
        REGION_ALIASES.put("ilocos",               R1);

        // ── Region II ────────────────────────────────────────────────────────
        String R2 = "Region II (Cagayan Valley)";
        REGION_ALIASES.put("2",                    R2);
        REGION_ALIASES.put("ii",                   R2);
        REGION_ALIASES.put("region ii",            R2);
        REGION_ALIASES.put("region 2",             R2);
        REGION_ALIASES.put("cagayan valley",       R2);

        // ── Region III ───────────────────────────────────────────────────────
        String R3 = "Region III (Central Luzon)";
        REGION_ALIASES.put("3",                    R3);
        REGION_ALIASES.put("iii",                  R3);
        REGION_ALIASES.put("region iii",           R3);
        REGION_ALIASES.put("region 3",             R3);
        REGION_ALIASES.put("central luzon",        R3);

        // ── Region IV-A ──────────────────────────────────────────────────────
        String R4A = "Region IV-A (CALABARZON)";
        REGION_ALIASES.put("4",                    R4A);
        REGION_ALIASES.put("iv",                   R4A);
        REGION_ALIASES.put("iv-a",                 R4A);
        REGION_ALIASES.put("region iv",            R4A);
        REGION_ALIASES.put("region iv-a",          R4A);
        REGION_ALIASES.put("region 4",             R4A);
        REGION_ALIASES.put("region 4a",            R4A);
        REGION_ALIASES.put("calabarzon",           R4A);

        // ── Region V ─────────────────────────────────────────────────────────
        String R5 = "Region V (Bicol Region)";
        REGION_ALIASES.put("5",                    R5);
        REGION_ALIASES.put("v",                    R5);
        REGION_ALIASES.put("region v",             R5);
        REGION_ALIASES.put("region 5",             R5);
        REGION_ALIASES.put("bicol region",         R5);
        REGION_ALIASES.put("bicol",                R5);

        // ── Region VI ────────────────────────────────────────────────────────
        String R6 = "Region VI (Western Visayas)";
        REGION_ALIASES.put("6",                    R6);
        REGION_ALIASES.put("vi",                   R6);
        REGION_ALIASES.put("region vi",            R6);
        REGION_ALIASES.put("region 6",             R6);
        REGION_ALIASES.put("western visayas",      R6);

        // ── Region VII ───────────────────────────────────────────────────────
        String R7 = "Region VII (Central Visayas)";
        REGION_ALIASES.put("7",                    R7);
        REGION_ALIASES.put("vii",                  R7);
        REGION_ALIASES.put("region vii",           R7);
        REGION_ALIASES.put("region 7",             R7);
        REGION_ALIASES.put("central visayas",      R7);

        // ── Region VIII ──────────────────────────────────────────────────────
        String R8 = "Region VIII (Eastern Visayas)";
        REGION_ALIASES.put("8",                    R8);
        REGION_ALIASES.put("viii",                 R8);
        REGION_ALIASES.put("region viii",          R8);
        REGION_ALIASES.put("region 8",             R8);
        REGION_ALIASES.put("eastern visayas",      R8);

        // ── Region IX ────────────────────────────────────────────────────────
        String R9 = "Region IX (Zamboanga Peninsula)";
        REGION_ALIASES.put("9",                    R9);
        REGION_ALIASES.put("ix",                   R9);
        REGION_ALIASES.put("region ix",            R9);
        REGION_ALIASES.put("region 9",             R9);
        REGION_ALIASES.put("zamboanga peninsula",  R9);
        REGION_ALIASES.put("zamboanga",            R9);

        // ── Region X ─────────────────────────────────────────────────────────
        String R10 = "Region X (Northern Mindanao)";
        REGION_ALIASES.put("10",                   R10);
        REGION_ALIASES.put("x",                    R10);
        REGION_ALIASES.put("region x",             R10);
        REGION_ALIASES.put("region 10",            R10);
        REGION_ALIASES.put("northern mindanao",    R10);

        // ── Region XI ────────────────────────────────────────────────────────
        String R11 = "Region XI (Davao Region)";
        REGION_ALIASES.put("11",                   R11);
        REGION_ALIASES.put("xi",                   R11);
        REGION_ALIASES.put("region xi",            R11);
        REGION_ALIASES.put("region 11",            R11);
        REGION_ALIASES.put("davao region",         R11);
        REGION_ALIASES.put("davao",                R11);

        // ── Region XII ───────────────────────────────────────────────────────
        String R12 = "Region XII (SOCCSKSARGEN)";
        REGION_ALIASES.put("12",                   R12);
        REGION_ALIASES.put("xii",                  R12);
        REGION_ALIASES.put("region xii",           R12);
        REGION_ALIASES.put("region 12",            R12);
        REGION_ALIASES.put("soccsksargen",         R12);
        REGION_ALIASES.put("socsksargen",          R12);

        // ── NCR ──────────────────────────────────────────────────────────────
        String NCR = "National Capital Region (NCR)";
        REGION_ALIASES.put("ncr",                  NCR);
        REGION_ALIASES.put("13",                   NCR);
        REGION_ALIASES.put("national capital region", NCR);
        REGION_ALIASES.put("metro manila",         NCR);
        REGION_ALIASES.put("region 13",            NCR);

        // ── CAR ──────────────────────────────────────────────────────────────
        String CAR = "Cordillera Administrative Region (CAR)";
        REGION_ALIASES.put("car",                  CAR);
        REGION_ALIASES.put("cara",                 CAR);
        REGION_ALIASES.put("cordillera",           CAR);
        REGION_ALIASES.put("cordillera administrative region", CAR);

        // ── BARMM ────────────────────────────────────────────────────────────
        String BARMM = "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)";
        REGION_ALIASES.put("barmm",                BARMM);
        REGION_ALIASES.put("armm",                 BARMM);
        REGION_ALIASES.put("bangsamoro",           BARMM);
        REGION_ALIASES.put("bangsamoro autonomous region in muslim mindanao", BARMM);

        // ── Region XIII (Caraga) ─────────────────────────────────────────────
        String R13 = "Region XIII (Caraga)";
        REGION_ALIASES.put("xiii",                 R13);
        REGION_ALIASES.put("region xiii",          R13);
        REGION_ALIASES.put("caraga",               R13);

        // ── MIMAROPA ─────────────────────────────────────────────────────────
        String MIMA = "MIMAROPA Region";
        REGION_ALIASES.put("mimaropa",             MIMA);
        REGION_ALIASES.put("mimaropa region",      MIMA);
        REGION_ALIASES.put("iv-b",                 MIMA);
        REGION_ALIASES.put("region iv-b",          MIMA);

        // ── NIR ──────────────────────────────────────────────────────────────
        String NIR = "Negros Island Region (NIR)";
        REGION_ALIASES.put("nir",                  NIR);
        REGION_ALIASES.put("negros island region", NIR);
        REGION_ALIASES.put("negros island",        NIR);
    }

    // ── Province alias map ────────────────────────────────────────────────────
    private static final Map<String, String> PROVINCE_ALIASES = new HashMap<>();
    static {
        PROVINCE_ALIASES.put("cam. norte",          "Camarines Norte");
        PROVINCE_ALIASES.put("cam. sur",            "Camarines Sur");
        PROVINCE_ALIASES.put("occ. mindoro",        "Occidental Mindoro");
        PROVINCE_ALIASES.put("or. mindoro",         "Oriental Mindoro");
        PROVINCE_ALIASES.put("mt. province",        "Mountain Province");
        PROVINCE_ALIASES.put("davao de oro",        "Davao de Oro");
        PROVINCE_ALIASES.put("davao city",          "Davao del Sur");
        PROVINCE_ALIASES.put("metro manila",        "Metro Manila");
        PROVINCE_ALIASES.put("metro zamboanga",     "Zamboanga del Sur");
        PROVINCE_ALIASES.put("guimaraz",            "Guimaras");
        PROVINCE_ALIASES.put("zambaonga del norte", "Zamboanga del Norte");
        PROVINCE_ALIASES.put("sarangani province",  "Sarangani");
        PROVINCE_ALIASES.put("eastern leyte",       "Leyte");
        PROVINCE_ALIASES.put("western leyte",       "Leyte");
        PROVINCE_ALIASES.put("eastern samar",       "Eastern Samar");
        PROVINCE_ALIASES.put("western samar",       "Samar");
        PROVINCE_ALIASES.put("northern samar",      "Northern Samar");
        PROVINCE_ALIASES.put("southern leyte",      "Southern Leyte");
    }

    // ── Main entry ────────────────────────────────────────────────────────────

    public void importPostalOffices(MultipartFile file) throws IOException {
        System.out.println("===== STARTING IMPORT =====");

        List<PostalOfficeImportDTO> rows = readExcelFile(file);
        System.out.println("Read " + rows.size() + " data rows");

        Map<String, Area>             areaMap     = buildAreaMap();
        Map<String, Regions>          regionMap   = buildRegionMap();
        Map<String, Province>         provinceMap = buildProvinceMap();
        Map<String, CityMunicipality> cityMap     = buildCityMap();
        Map<String, Barangay>         barangayMap = buildBarangayMap();
        Map<String, String>           zipMap      = buildZipToBarangayMap();

        Provider defaultProvider = getOrCreateDefaultProvider();

        int inserted = 0, updated = 0;
        List<String> warnings = new ArrayList<>();
        List<String> errors   = new ArrayList<>();

        int rowNum = 1;
        for (PostalOfficeImportDTO dto : rows) {
            rowNum++;
            try {
                PostalOffice office = resolveExistingOffice(dto, rowNum, warnings);
                boolean isNew = (office == null);

                if (isNew) {
                    office = new PostalOffice();
                    office.setName(dto.getPostOfficeName());
                }

                if (office != null) {
                    applyIfNotBlank(dto.getPostmaster(),                office::setPostmaster);
                    applyIfNotNull(dto.getNoOfEmployees(),              office::setNoOfEmployees);
                    
                    // Fix swapped coordinates: validate and swap if needed
                    Double lng = dto.getLongitude();
                    Double lat = dto.getLatitude();
                    if (lng != null && lat != null) {
                        // Latitude must be between -90 and 90, Longitude between -180 and 180
                        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
                            // Coordinates appear to be swapped, fix them
                            System.out.println("Row " + rowNum + ": Swapped coordinates detected - fixing");
                            Double temp = lat;
                            lat = lng;
                            lng = temp;
                        }
                        // Additional validation: Philippines coordinates
                        // Latitude: ~4°N to ~21°N, Longitude: ~116°E to ~127°E
                        if (lat < 4 || lat > 21 || lng < 116 || lng > 127) {
                            System.out.println("Row " + rowNum + ": Invalid coordinates - lat=" + lat + ", lng=" + lng + " - skipping");
                            lat = null;
                            lng = null;
                        }
                    }
                    applyIfNotNull(lng, office::setLongitude);
                    applyIfNotNull(lat, office::setLatitude);
                    
                    applyIfNotBlank(dto.getZipCode(),                   office::setZipCode);
                    applyIfNotBlank(dto.getAddress(),                   office::setAddress);
                    applyIfNotBlank(dto.getServiceProvided(),           office::setServiceProvided);
                    applyIfNotBlank(dto.getClassification(),            office::setClassification);
                    applyIfNotBlank(dto.getInternetServiceProvider(),   office::setInternetServiceProvider);
                    applyIfNotBlank(dto.getTypeOfConnection(),          office::setTypeOfConnection);
                    applyIfNotBlank(dto.getSpeed(),                     office::setSpeed);
                    applyIfNotBlank(dto.getStaticIpAddress(),           office::setStaticIpAddress);
                    applyIfNotBlank(dto.getPostalOfficeContactPerson(), office::setPostalOfficeContactPerson);
                    applyIfNotBlank(dto.getPostalOfficeContactNumber(), office::setPostalOfficeContactNumber);
                    applyIfNotBlank(dto.getIspContactPerson(),          office::setIspContactPerson);
                    applyIfNotBlank(dto.getIspContactNumber(),          office::setIspContactNumber);

                    if (!blank(dto.getArea())) {
                        Area area = resolveArea(dto.getArea(), areaMap);
                        if (area == null) warnings.add("Row " + rowNum + ": Area not found → '" + dto.getArea() + "'");
                        else office.setArea(area);
                    }

                    resolveLocation(dto, office, regionMap, provinceMap, cityMap, barangayMap, zipMap, rowNum, warnings);

                    if (!blank(dto.getConnectivityStatus())) {
                        office.setConnectionStatus(parseConnectionStatus(dto.getConnectivityStatus()));
                    }

                    if (isNew) office.setActiveConnectivity(null);
                    PostalOffice savedOffice = postalOfficeRepository.save(office);

                    handleConnectivity(savedOffice, dto, defaultProvider, rowNum, warnings);

                    if (isNew) inserted++; else updated++;
                }

            } catch (Exception e) {
                errors.add("Row " + rowNum + ": " + e.getMessage());
                e.printStackTrace();
            }
        }

        System.out.println("Inserted: " + inserted + " | Updated: " + updated);
        System.out.println("Warnings: " + warnings.size());
        warnings.forEach(System.out::println);
        System.out.println("Errors: " + errors.size());

        if (!errors.isEmpty()) {
            String msg = errors.size() + " row(s) failed.\n"
                    + String.join("\n", errors.subList(0, Math.min(10, errors.size())));
            if (errors.size() > 10) msg += "\n... and " + (errors.size() - 10) + " more";
            throw new RuntimeException(msg);
        }

        System.out.println("===== IMPORT COMPLETE: " + inserted + " inserted, " + updated + " updated =====");
    }

    // ── Office deduplication — 3 layers ──────────────────────────────────────

    /**
     * LAYER 1: Match by exact postal office name (case-insensitive).
     * LAYER 2: If no name match (or name is blank), match by longitude + latitude.
     * LAYER 3: If no coords match, match by zip code.
     *
     * Returns the existing PostalOffice if found, or null if this is a new office.
     */
    private PostalOffice resolveExistingOffice(PostalOfficeImportDTO dto, int rowNum, List<String> warnings) {
        String officeName = dto.getPostOfficeName();

        // LAYER 1 — name match
        if (!blank(officeName)) {
            PostalOffice byName = postalOfficeRepository
                    .findByNameContainingIgnoreCase(officeName)
                    .stream()
                    .filter(o -> normalize(o.getName()).equals(normalize(officeName)))
                    .findFirst()
                    .orElse(null);
            if (byName != null) {
                System.out.println("Row " + rowNum + ": Matched by NAME → '" + officeName + "'");
                return byName;
            }
        }

        // LAYER 2 — coordinate match
        if (dto.getLongitude() != null && dto.getLatitude() != null) {
            List<PostalOffice> byCoords = postalOfficeRepository
                    .findByLongitudeAndLatitude(dto.getLongitude(), dto.getLatitude());
            if (!byCoords.isEmpty()) {
                System.out.println("Row " + rowNum + ": Matched by COORDS → '" + byCoords.get(0).getName() + "'");
                return byCoords.get(0);
            }
        }

        // LAYER 3 — zip code match
        if (!blank(dto.getZipCode())) {
            List<PostalOffice> byZip = postalOfficeRepository.findByZipCode(dto.getZipCode().trim());
            if (!byZip.isEmpty()) {
                System.out.println("Row " + rowNum + ": Matched by ZIP '" + dto.getZipCode() + "' → '" + byZip.get(0).getName() + "'");
                return byZip.get(0);
            }
        }

        return null; // truly new office
    }

    // ── Connectivity handler ──────────────────────────────────────────────────

    /**
     * - Every connected office gets a connectivity record, date or no date.
     * - Deduplication logic:
     *     • If dateConnected is non-null  → deduplicate by matching dateConnected value.
     *     • If dateConnected IS null      → deduplicate by any existing record that also
     *                                       has null dateConnected (prevents duplicate
     *                                       null-date rows on reimport).
     * - dateConnected / dateDisconnected are stored as null when the Excel cell is empty.
     */
    private void handleConnectivity(
            PostalOffice savedOffice,
            PostalOfficeImportDTO dto,
            Provider defaultProvider,
            int rowNum,
            List<String> warnings) {

        boolean isConnected    = Boolean.TRUE.equals(savedOffice.getConnectionStatus());
        LocalDateTime dateConn = dto.getDateConnected();
        LocalDateTime dateDisc = dto.getDateDisconnected();

        // Skip entirely if not connected and no dates provided
        if (!isConnected && dateConn == null && dateDisc == null) return;

        List<Connectivity> existing = connectivityRepository.findByPostalOfficeId(savedOffice.getId());

        // Deduplicate:
        //   - dateConn non-null → match by exact dateConn value
        //   - dateConn null     → match any existing record that also has null dateConn
        boolean alreadyExists = existing.stream().anyMatch(c ->
                dateConn != null
                    ? dateConn.equals(c.getDateConnected())
                    : c.getDateConnected() == null
        );
        if (alreadyExists) return;

        Connectivity conn = new Connectivity();
        conn.setPostalOffice(savedOffice);
        conn.setProvider(defaultProvider);
        conn.setDateConnected(dateConn);     // stored as null when cell is empty
        conn.setDateDisconnected(dateDisc);  // stored as null when cell is empty

        Connectivity saved = connectivityRepository.save(conn);

        if (isConnected && dateDisc == null) {
            savedOffice.setActiveConnectivity(saved);
            postalOfficeRepository.save(savedOffice);
        } else if (!isConnected && savedOffice.getActiveConnectivity() != null) {
            savedOffice.setActiveConnectivity(null);
            postalOfficeRepository.save(savedOffice);
        }
    }

    // ── Location resolver ─────────────────────────────────────────────────────

    private void resolveLocation(
            PostalOfficeImportDTO dto,
            PostalOffice office,
            Map<String, Regions>          regionMap,
            Map<String, Province>         provinceMap,
            Map<String, CityMunicipality> cityMap,
            Map<String, Barangay>         barangayMap,
            Map<String, String>           zipMap,
            int rowNum,
            List<String> warnings) {

        ZipDerived zip = deriveFromZip(dto.getZipCode(), zipMap, barangayMap);

        if (!blank(dto.getRegionName())) {
            Regions r = lookupRegion(dto.getRegionName(), regionMap);
            if (r != null) office.setRegion(r);
            else warnings.add("Row " + rowNum + ": Region not found → '" + dto.getRegionName() + "'");
        }

        if (!blank(dto.getProvinceName())) {
            Province p = lookupProvince(dto.getProvinceName(), provinceMap);
            if (p != null) office.setProvince(p);
            else warnings.add("Row " + rowNum + ": Province not found → '" + dto.getProvinceName() + "'");
        } else if (zip.province != null && office.getProvince() == null) {
            office.setProvince(zip.province);
        }

        if (!blank(dto.getCityMunicipalityName())) {
            CityMunicipality c = cityMap.get(normalize(dto.getCityMunicipalityName()));
            if (c != null) office.setCityMunicipality(c);
            else warnings.add("Row " + rowNum + ": City/Municipality not found → '" + dto.getCityMunicipalityName() + "'");
        } else if (zip.city != null && office.getCityMunicipality() == null) {
            office.setCityMunicipality(zip.city);
        }

        if (!blank(dto.getBarangayName())) {
            Barangay b = barangayMap.get(normalize(dto.getBarangayName()));
            if (b != null) office.setBarangay(b);
            else warnings.add("Row " + rowNum + ": Barangay not found → '" + dto.getBarangayName() + "'");
        } else if (zip.barangay != null && office.getBarangay() == null) {
            office.setBarangay(zip.barangay);
        }
    }

    private Regions lookupRegion(String raw, Map<String, Regions> regionMap) {
        if (blank(raw)) return null;
        String key = normalize(raw);

        // 1. Exact match
        Regions found = regionMap.get(key);
        if (found != null) return found;

        // 2. Alias → exact match on resolved full name
        String alias = REGION_ALIASES.get(key);
        if (alias != null) {
            found = regionMap.get(normalize(alias));
            if (found != null) return found;
        }

        // 3. Legacy "region X" prefix attempt
        found = regionMap.get("region " + key);
        if (found != null) return found;

        // 4. Partial / contains match — handles Excel values that are substrings
        //    of the full DB name, e.g. "Ilocos Region" inside
        //    "Region I (Ilocos Region)", or "CALABARZON" inside
        //    "Region IV-A (CALABARZON)"
        for (Map.Entry<String, Regions> entry : regionMap.entrySet()) {
            String dbKey = entry.getKey(); // already normalized
            if (dbKey.contains(key) || key.contains(dbKey)) {
                return entry.getValue();
            }
        }

        return null;
    }

    private Province lookupProvince(String raw, Map<String, Province> provinceMap) {
        if (blank(raw)) return null;
        String key = normalize(raw);
        Province found = provinceMap.get(key);
        if (found != null) return found;
        String alias = PROVINCE_ALIASES.get(key);
        if (alias != null) { found = provinceMap.get(normalize(alias)); if (found != null) return found; }
        return null;
    }

    private static class ZipDerived {
        Barangay barangay; CityMunicipality city; Province province;
    }

    private ZipDerived deriveFromZip(String zipCode, Map<String, String> zipMap, Map<String, Barangay> barangayMap) {
        ZipDerived result = new ZipDerived();
        if (blank(zipCode)) return result;
        String barangayName = zipMap.get(zipCode.trim());
        if (barangayName == null) return result;
        Barangay barangay = barangayMap.get(normalize(barangayName));
        if (barangay == null) return result;
        result.barangay = barangay;
        CityMunicipality city = barangay.getCityMunicipality();
        if (city != null) { result.city = city; result.province = city.getProvince(); }
        return result;
    }

    // ── Excel reader ──────────────────────────────────────────────────────────

    private List<PostalOfficeImportDTO> readExcelFile(MultipartFile file) throws IOException {
        List<PostalOfficeImportDTO> data = new ArrayList<>();
        Workbook workbook = new XSSFWorkbook(file.getInputStream());
        Sheet sheet = workbook.getSheetAt(0);
        System.out.println("Reading sheet: " + sheet.getSheetName());

        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null || isRowBlank(row)) continue;

            PostalOfficeImportDTO dto = new PostalOfficeImportDTO();
            dto.setArea(getString(row, 0));
            dto.setPostOfficeName(getString(row, 1));
            dto.setPostmaster(getString(row, 2));
            dto.setNoOfEmployees(getInteger(row, 3));
            dto.setLongitude(getDouble(row, 4));
            dto.setLatitude(getDouble(row, 5));
            dto.setRegionName(getString(row, 8));
            dto.setProvinceName(getString(row, 9));
            dto.setCityMunicipalityName(getString(row, 10));
            dto.setBarangayName(getString(row, 11));
            dto.setZipCode(getString(row, 12));
            dto.setAddress(getString(row, 13));
            dto.setServiceProvided(getString(row, 14));
            dto.setClassification(getString(row, 15));
            dto.setConnectivityStatus(getString(row, 16));
            dto.setInternetServiceProvider(getString(row, 17));
            dto.setTypeOfConnection(getString(row, 18));
            dto.setSpeed(getString(row, 19));
            dto.setStaticIpAddress(getString(row, 20));
            dto.setPostalOfficeContactPerson(getString(row, 21));
            dto.setPostalOfficeContactNumber(getString(row, 22));
            dto.setIspContactPerson(getString(row, 23));
            dto.setIspContactNumber(getString(row, 24));
            dto.setDateConnected(parseFlexibleDate(row, 25));    // null when cell is empty
            dto.setDateDisconnected(parseFlexibleDate(row, 26)); // null when cell is empty

            data.add(dto);
        }

        workbook.close();
        return data;
    }

    // ── Flexible date parser ──────────────────────────────────────────────────

    /**
     * Returns null when the cell is missing, blank, or contains an unrecognized value.
     * All other cases are parsed into a LocalDateTime.
     */
    private LocalDateTime parseFlexibleDate(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;

        // Blank cell type — treat as no date
        if (cell.getCellType() == CellType.BLANK) return null;

        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            try {
                return cell.getDateCellValue().toInstant()
                        .atZone(java.time.ZoneId.systemDefault()).toLocalDateTime();
            } catch (Exception ignored) {}
        }

        if (cell.getCellType() == CellType.NUMERIC) {
            long num = (long) cell.getNumericCellValue();
            if (num >= 1900 && num <= 2100) return LocalDateTime.of((int) num, 1, 1, 0, 0);
            return null;
        }

        String raw = cell.getCellType() == CellType.STRING
                ? cell.getStringCellValue().trim()
                : String.valueOf(cell.getNumericCellValue()).trim();

        // Empty string — treat as no date
        if (raw.isEmpty()) return null;

        if (raw.matches("\\d{4}")) {
            try { return LocalDateTime.of(Integer.parseInt(raw), 1, 1, 0, 0); } catch (Exception ignored) {}
        }
        if (raw.matches("\\d{4}-\\d{2}")) {
            try {
                String[] p = raw.split("-");
                return LocalDateTime.of(Integer.parseInt(p[0]), Integer.parseInt(p[1]), 1, 0, 0);
            } catch (Exception ignored) {}
        }

        for (DateTimeFormatter fmt : Arrays.asList(
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd"),
                DateTimeFormatter.ofPattern("M/d/yyyy HH:mm"),
                DateTimeFormatter.ofPattern("M/d/yyyy"),
                DateTimeFormatter.ofPattern("MM/dd/yyyy"),
                DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm:ss"))) {
            try { return LocalDateTime.parse(raw, fmt); } catch (DateTimeParseException ignored) {}
        }

        System.out.println("WARN: Unrecognized date → '" + raw + "' (stored as null)");
        return null;
    }

    // ── Lookup map builders ───────────────────────────────────────────────────

    private Map<String, Area> buildAreaMap() {
        Map<String, Area> map = new HashMap<>();
        areaRepository.findAll().forEach(a -> map.put(normalize(a.getAreaName()), a));
        return map;
    }
    private Map<String, Regions> buildRegionMap() {
        Map<String, Regions> map = new HashMap<>();
        regionsRepository.findAll().forEach(r -> map.put(normalize(r.getName()), r));
        return map;
    }
    private Map<String, Province> buildProvinceMap() {
        Map<String, Province> map = new HashMap<>();
        provinceRepository.findAll().forEach(p -> map.put(normalize(p.getName()), p));
        return map;
    }
    private Map<String, CityMunicipality> buildCityMap() {
        Map<String, CityMunicipality> map = new HashMap<>();
        cityMunicipalityRepository.findAll().forEach(c -> map.put(normalize(c.getName()), c));
        return map;
    }
    private Map<String, Barangay> buildBarangayMap() {
        Map<String, Barangay> map = new HashMap<>();
        barangayRepository.findAll().forEach(b -> map.put(normalize(b.getName()), b));
        return map;
    }
    private Map<String, String> buildZipToBarangayMap() {
        Map<String, String> map = new HashMap<>();
        zipCodeRepository.findAll().forEach(z -> {
            if (z.getZipcode() != null && z.getBarangay() != null)
                map.put(z.getZipcode().trim(), z.getBarangay());
        });
        return map;
    }

    // ── Area resolver ─────────────────────────────────────────────────────────

    private Area resolveArea(String raw, Map<String, Area> areaMap) {
        if (blank(raw)) return null;
        Area found = areaMap.get(normalize(raw));
        if (found != null) return found;
        String converted = raw.trim().replaceAll("(?i)area[-\\s]*(\\d+)", "area $1").toLowerCase();
        return areaMap.get(normalize(converted));
    }

    // ── Default provider ──────────────────────────────────────────────────────

    private Provider getOrCreateDefaultProvider() {
        return providerRepository.findAll().stream().findFirst().orElseGet(() -> {
            Provider p = new Provider(); p.setName("Default Provider"); return providerRepository.save(p);
        });
    }

    // ── Value applicators ─────────────────────────────────────────────────────

    private void applyIfNotBlank(String value, java.util.function.Consumer<String> setter) {
        if (!blank(value)) setter.accept(value);
    }
    private <T> void applyIfNotNull(T value, java.util.function.Consumer<T> setter) {
        if (value != null) setter.accept(value);
    }

    // ── Cell readers ──────────────────────────────────────────────────────────

    private String getString(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case STRING:
                String v = cell.getStringCellValue().trim();
                return v.isEmpty() ? null : v;
            case NUMERIC:
                double d = cell.getNumericCellValue();
                if (d == Math.floor(d) && !Double.isInfinite(d)) return String.valueOf((long) d);
                return String.valueOf(d);
            case BOOLEAN: return String.valueOf(cell.getBooleanCellValue());
            default: return null;
        }
    }

    private Double getDouble(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC) {
            double value = cell.getNumericCellValue();
            return isValidCoordinateValue(value) ? value : null;
        }
        if (cell.getCellType() == CellType.STRING) {
            try {
                double value = Double.parseDouble(cell.getStringCellValue().trim());
                return isValidCoordinateValue(value) ? value : null;
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private boolean isValidCoordinateValue(double value) {
        return Math.abs(value) <= 1000.0;
    }

    private Integer getInteger(Row row, int col) {
        Double d = getDouble(row, col); return d == null ? null : d.intValue();
    }

    // ── Misc helpers ──────────────────────────────────────────────────────────

    private boolean parseConnectionStatus(String raw) {
        if (blank(raw)) return false;
        String v = raw.trim().toLowerCase();
        return v.equals("connected") || v.equals("yes") || v.equals("true") || v.equals("1") || v.equals("active");
    }

    private String normalize(String s) { return s == null ? "" : s.trim().toLowerCase(); }
    private boolean blank(String s) { return s == null || s.trim().isEmpty(); }

    private boolean isRowBlank(Row row) {
        for (Cell cell : row) {
            if (cell != null && cell.getCellType() != CellType.BLANK)
                if (!blank(getString(row, cell.getColumnIndex()))) return false;
        }
        return true;
    }
}