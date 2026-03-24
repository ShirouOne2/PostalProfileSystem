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
    private static final Map<String, String> REGION_ALIASES = new HashMap<>();
    static {
        REGION_ALIASES.put("1",    "Region I");
        REGION_ALIASES.put("2",    "Region II");
        REGION_ALIASES.put("3",    "Region III");
        REGION_ALIASES.put("4",    "Region IV");
        REGION_ALIASES.put("5",    "Region V");
        REGION_ALIASES.put("6",    "Region VI");
        REGION_ALIASES.put("7",    "Region VII");
        REGION_ALIASES.put("8",    "Region VIII");
        REGION_ALIASES.put("9",    "Region IX");
        REGION_ALIASES.put("10",   "Region X");
        REGION_ALIASES.put("11",   "Region XI");
        REGION_ALIASES.put("12",   "Region XII");
        REGION_ALIASES.put("13",   "Region XIII");
        REGION_ALIASES.put("i",    "Region I");
        REGION_ALIASES.put("ii",   "Region II");
        REGION_ALIASES.put("iii",  "Region III");
        REGION_ALIASES.put("iv",   "Region IV");
        REGION_ALIASES.put("v",    "Region V");
        REGION_ALIASES.put("vi",   "Region VI");
        REGION_ALIASES.put("vii",  "Region VII");
        REGION_ALIASES.put("viii", "Region VIII");
        REGION_ALIASES.put("ix",   "Region IX");
        REGION_ALIASES.put("x",    "Region X");
        REGION_ALIASES.put("xi",   "Region XI");
        REGION_ALIASES.put("xii",  "Region XII");
        REGION_ALIASES.put("xiii", "Region XIII");
        REGION_ALIASES.put("car",      "CAR");
        REGION_ALIASES.put("cara",     "CAR");
        REGION_ALIASES.put("nir",      "NIR");
        REGION_ALIASES.put("barmm",    "BARMM");
        REGION_ALIASES.put("mimaropa", "MIMAROPA");
        REGION_ALIASES.put("ncr",      "NCR");
        REGION_ALIASES.put("iv-a",     "Region IV-A");
        REGION_ALIASES.put("iv-b",     "Region IV-B");
        REGION_ALIASES.put("region ix",   "Region IX");
        REGION_ALIASES.put("region vi",   "Region VI");
        REGION_ALIASES.put("region x",    "Region X");
        REGION_ALIASES.put("region xiii", "Region XIII");
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
                    applyIfNotNull(dto.getLongitude(),                  office::setLongitude);
                    applyIfNotNull(dto.getLatitude(),                   office::setLatitude);
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
        Regions found = regionMap.get(key);
        if (found != null) return found;
        String alias = REGION_ALIASES.get(key);
        if (alias != null) { found = regionMap.get(normalize(alias)); if (found != null) return found; }
        return regionMap.get("region " + key);
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