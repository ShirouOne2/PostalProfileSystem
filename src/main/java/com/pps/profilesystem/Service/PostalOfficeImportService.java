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

    private static final List<DateTimeFormatter> DATE_FORMATTERS = Arrays.asList(
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("M/d/yyyy HH:mm"),
            DateTimeFormatter.ofPattern("M/d/yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm:ss")
    );

    // ── Main entry ────────────────────────────────────────────────────────────

    public void importPostalOffices(MultipartFile file) throws IOException {
        System.out.println("===== STARTING IMPORT =====");

        List<PostalOfficeImportDTO> rows = readExcelFile(file);
        System.out.println("Read " + rows.size() + " data rows");

        // Pre-load lookup maps (all normalized to lowercase for matching)
        Map<String, Area>             areaMap     = buildAreaMap();
        Map<String, Regions>          regionMap   = buildRegionMap();
        Map<String, Province>         provinceMap = buildProvinceMap();
        Map<String, CityMunicipality> cityMap     = buildCityMap();
        Map<String, Barangay>         barangayMap = buildBarangayMap();
        Map<String, String>           zipMap      = buildZipToBarangayMap(); // zip → barangay name

        Provider defaultProvider = getOrCreateDefaultProvider();

        int inserted = 0, updated = 0;
        List<String> warnings = new ArrayList<>();
        List<String> errors   = new ArrayList<>();

        int rowNum = 1;
        for (PostalOfficeImportDTO dto : rows) {
            rowNum++;
            try {
                // ── Match existing office by exact name (case-insensitive) ─
                String officeName = dto.getPostOfficeName();
                boolean isNew = false;

                PostalOffice office = null;
                if (!blank(officeName)) {
                    office = postalOfficeRepository
                            .findByNameContainingIgnoreCase(officeName)
                            .stream()
                            .filter(o -> normalize(o.getName()).equals(normalize(officeName)))
                            .findFirst()
                            .orElse(null);
                }

                if (office == null) {
                    office = new PostalOffice();
                    office.setName(officeName);
                    isNew = true;
                }

                // ── Apply non-blank fields only (keep existing DB value if blank) ──
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

                // ── Area ──────────────────────────────────────────────────
                if (!blank(dto.getArea())) {
                    Area area = resolveArea(dto.getArea(), areaMap);
                    if (area == null) {
                        warnings.add("Row " + rowNum + ": Area not found → '" + dto.getArea() + "'");
                    } else {
                        office.setArea(area);
                    }
                }

                // ── Location hierarchy ────────────────────────────────────
                resolveLocation(dto, office, regionMap, provinceMap, cityMap, barangayMap, zipMap, rowNum, warnings);

                // ── Connectivity status ───────────────────────────────────
                if (!blank(dto.getConnectivityStatus())) {
                    office.setConnectionStatus(parseConnectionStatus(dto.getConnectivityStatus()));
                }

                // ── Save office ───────────────────────────────────────────
                if (isNew) office.setActiveConnectivity(null);
                PostalOffice savedOffice = postalOfficeRepository.save(office);

                // ── Connectivity record ───────────────────────────────────
                handleConnectivity(savedOffice, dto, defaultProvider, isNew);

                if (isNew) inserted++; else updated++;

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

    // ── Location resolver ─────────────────────────────────────────────────────

    /**
     * For each location level:
     *   1. Try matching by name from the Excel column
     *   2. If name is blank OR not found → try deriving from the zip code
     *   3. If still nothing → leave the existing DB value untouched (warn if name was provided)
     */
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

        // Region (no zip fallback — zip table doesn't store region)
        if (!blank(dto.getRegionName())) {
            Regions r = regionMap.get(normalize(dto.getRegionName()));
            if (r != null) office.setRegion(r);
            else warnings.add("Row " + rowNum + ": Region not found → '" + dto.getRegionName() + "'");
        }

        // Province
        if (!blank(dto.getProvinceName())) {
            Province p = provinceMap.get(normalize(dto.getProvinceName()));
            if (p != null) office.setProvince(p);
            else warnings.add("Row " + rowNum + ": Province not found → '" + dto.getProvinceName() + "'");
        } else if (zip.province != null && office.getProvince() == null) {
            office.setProvince(zip.province);
        }

        // City/Municipality
        if (!blank(dto.getCityMunicipalityName())) {
            CityMunicipality c = cityMap.get(normalize(dto.getCityMunicipalityName()));
            if (c != null) office.setCityMunicipality(c);
            else warnings.add("Row " + rowNum + ": City/Municipality not found → '" + dto.getCityMunicipalityName() + "'");
        } else if (zip.city != null && office.getCityMunicipality() == null) {
            office.setCityMunicipality(zip.city);
        }

        // Barangay
        if (!blank(dto.getBarangayName())) {
            Barangay b = barangayMap.get(normalize(dto.getBarangayName()));
            if (b != null) office.setBarangay(b);
            else warnings.add("Row " + rowNum + ": Barangay not found → '" + dto.getBarangayName() + "'");
        } else if (zip.barangay != null && office.getBarangay() == null) {
            office.setBarangay(zip.barangay);
        }
    }

    // ── Zip-derived location ──────────────────────────────────────────────────

    private static class ZipDerived {
        Barangay         barangay;
        CityMunicipality city;
        Province         province;
    }

    private ZipDerived deriveFromZip(
            String zipCode,
            Map<String, String>   zipMap,
            Map<String, Barangay> barangayMap) {

        ZipDerived result = new ZipDerived();
        if (blank(zipCode)) return result;

        String barangayName = zipMap.get(zipCode.trim());
        if (barangayName == null) return result;

        Barangay barangay = barangayMap.get(normalize(barangayName));
        if (barangay == null) return result;

        result.barangay = barangay;
        CityMunicipality city = barangay.getCityMunicipality();
        if (city != null) {
            result.city     = city;
            result.province = city.getProvince();
        }
        return result;
    }

    // ── Connectivity handler ──────────────────────────────────────────────────

    /**
     * INSERT: create a connectivity record if connected or dates are present.
     * UPDATE: find the most recent connectivity record and update only the date fields.
     */
    private void handleConnectivity(
            PostalOffice savedOffice,
            PostalOfficeImportDTO dto,
            Provider defaultProvider,
            boolean isNew) {

        boolean isConnected = Boolean.TRUE.equals(savedOffice.getConnectionStatus());
        boolean hasDateInfo = dto.getDateConnected() != null || dto.getDateDisconnected() != null;

        if (isNew) {
            // ── INSERT: only create connectivity if there's something to record ──
            if (!isConnected && !hasDateInfo) return;

            Connectivity conn = new Connectivity();
            conn.setPostalOffice(savedOffice);
            conn.setProvider(defaultProvider);
            conn.setDateConnected(
                    dto.getDateConnected() != null ? dto.getDateConnected()
                    : isConnected ? LocalDateTime.now() : null);
            conn.setDateDisconnected(dto.getDateDisconnected());

            Connectivity saved = connectivityRepository.save(conn);

            // Only set as active if currently connected and not yet disconnected
            if (isConnected && dto.getDateDisconnected() == null) {
                savedOffice.setActiveConnectivity(saved);
                postalOfficeRepository.save(savedOffice);
            }

        } else {
            // ── UPDATE: only touch connectivity if Excel row has date info ──
            if (!hasDateInfo) return;

            // Find the connectivity record to update:
            // prefer the currently linked active one, fallback to most recent in history
            Connectivity conn = savedOffice.getActiveConnectivity();

            if (conn == null) {
                conn = connectivityRepository.findByPostalOfficeId(savedOffice.getId())
                        .stream()
                        .max(Comparator.comparing(c ->
                                c.getDateConnected() != null ? c.getDateConnected() : LocalDateTime.MIN))
                        .orElse(null);
            }

            if (conn == null) {
                // No existing record at all — create one
                conn = new Connectivity();
                conn.setPostalOffice(savedOffice);
                conn.setProvider(defaultProvider);
            }

            // Update date fields only; leave provider, plan, account number, etc. untouched
            if (dto.getDateConnected() != null)   conn.setDateConnected(dto.getDateConnected());
            if (dto.getDateDisconnected() != null) conn.setDateDisconnected(dto.getDateDisconnected());

            Connectivity saved = connectivityRepository.save(conn);

            // Re-link or unlink activeConnectivity based on current status
            if (isConnected && dto.getDateDisconnected() == null) {
                savedOffice.setActiveConnectivity(saved);
                postalOfficeRepository.save(savedOffice);
            } else if (!isConnected && savedOffice.getActiveConnectivity() != null) {
                savedOffice.setActiveConnectivity(null);
                postalOfficeRepository.save(savedOffice);
            }
        }
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
            // col 6 Image_Path → ignored
            // col 7 Local_Path → ignored
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
            dto.setDateConnected(getDateTime(row, 25));
            dto.setDateDisconnected(getDateTime(row, 26));

            data.add(dto);
        }

        workbook.close();
        return data;
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
            if (z.getZipcode() != null && z.getBarangay() != null) {
                map.put(z.getZipcode().trim(), z.getBarangay());
            }
        });
        return map;
    }

    // ── Area resolver ─────────────────────────────────────────────────────────

    private Area resolveArea(String raw, Map<String, Area> areaMap) {
        if (blank(raw)) return null;
        Area found = areaMap.get(normalize(raw));
        if (found != null) return found;
        // Handle "AREA-1", "AREA 1", "area1" → "area 1"
        String converted = raw.trim().replaceAll("(?i)area[-\\s]*(\\d+)", "area $1").toLowerCase();
        return areaMap.get(normalize(converted));
    }

    // ── Default provider ──────────────────────────────────────────────────────

    private Provider getOrCreateDefaultProvider() {
        return providerRepository.findAll().stream()
                .findFirst()
                .orElseGet(() -> {
                    Provider p = new Provider();
                    p.setName("Default Provider");
                    return providerRepository.save(p);
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
                // Return as plain long string (no decimals) for things like zip, phone
                if (d == Math.floor(d) && !Double.isInfinite(d))
                    return String.valueOf((long) d);
                return String.valueOf(d);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            default:
                return null;
        }
    }

    private Double getDouble(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC) return cell.getNumericCellValue();
        if (cell.getCellType() == CellType.STRING) {
            try { return Double.parseDouble(cell.getStringCellValue().trim()); }
            catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private Integer getInteger(Row row, int col) {
        Double d = getDouble(row, col);
        return d == null ? null : d.intValue();
    }

    private LocalDateTime getDateTime(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;

        // POI native date parsing for date-formatted numeric cells
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            try {
                return cell.getDateCellValue().toInstant()
                        .atZone(java.time.ZoneId.systemDefault())
                        .toLocalDateTime();
            } catch (Exception ignored) {}
        }

        // Fallback: parse as string
        String raw = getString(row, col);
        if (blank(raw)) return null;
        for (DateTimeFormatter fmt : DATE_FORMATTERS) {
            try { return LocalDateTime.parse(raw, fmt); }
            catch (DateTimeParseException ignored) {}
        }
        System.out.println("WARN: Could not parse date → '" + raw + "'");
        return null;
    }

    // ── Misc helpers ──────────────────────────────────────────────────────────

    private boolean parseConnectionStatus(String raw) {
        if (blank(raw)) return false;
        String v = raw.trim().toLowerCase();
        return v.equals("connected") || v.equals("yes") || v.equals("true")
                || v.equals("1") || v.equals("active");
    }

    private String normalize(String s) {
        return s == null ? "" : s.trim().toLowerCase();
    }

    private boolean blank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private boolean isRowBlank(Row row) {
        for (Cell cell : row) {
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                if (!blank(getString(row, cell.getColumnIndex()))) return false;
            }
        }
        return true;
    }
}