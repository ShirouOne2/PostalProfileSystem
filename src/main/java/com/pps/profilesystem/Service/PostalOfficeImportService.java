package com.pps.profilesystem.Service;

import com.pps.profilesystem.DTO.PostalOfficeImportDTO;
import com.pps.profilesystem.Entity.Area;
import com.pps.profilesystem.Entity.Barangay;
import com.pps.profilesystem.Entity.CityMunicipality;
import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Entity.Province;
import com.pps.profilesystem.Entity.Regions;
import com.pps.profilesystem.Entity.ZipCode;
import com.pps.profilesystem.Repository.AreaRepository;
import com.pps.profilesystem.Repository.BarangayRepository;
import com.pps.profilesystem.Repository.PostalOfficeRepository;
import com.pps.profilesystem.Repository.ZipCodeRepository;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Service
@Transactional
public class PostalOfficeImportService {
    
    @Autowired
    private PostalOfficeRepository postalOfficeRepository;
    
    @Autowired
    private ZipCodeRepository zipCodeRepository;
    
    @Autowired
    private AreaRepository areaRepository;
    
    @Autowired
    private BarangayRepository barangayRepository;
    
    public void importPostalOffices(MultipartFile file) throws IOException {
        System.out.println("===== STARTING IMPORT =====");
        
        List<PostalOfficeImportDTO> excelData = readExcelFile(file);
        System.out.println("Read " + excelData.size() + " rows from Excel");
        
        // Pre-load lookup data into maps
        Map<String, Area> areaMap = loadAreaMap();
        System.out.println("Loaded " + areaMap.size() + " areas");
        
        Map<String, Barangay> barangayMap = loadBarangayMap();
        System.out.println("Loaded " + barangayMap.size() + " barangays");
        
        Map<String, String> zipToBarangayMap = loadZipToBarangayMap();
        System.out.println("Loaded " + zipToBarangayMap.size() + " zip codes");
        
        List<PostalOffice> postalOfficesToSave = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        int rowNumber = 1; // Start from 1 (header is row 0)
        
        for (PostalOfficeImportDTO dto : excelData) {
            rowNumber++;
            try {
                // 1. Handle AREA (now optional)
                Area area = null;
                if (!isNullOrEmpty(dto.getArea())) {
                    try {
                        area = getArea(dto.getArea(), areaMap);
                    } catch (RuntimeException e) {
                        warnings.add("Row " + rowNumber + ": " + e.getMessage());
                    }
                } else {
                    warnings.add("Row " + rowNumber + ": Missing AREA");
                }
                
                // 2. Handle POST OFFICE NAME (now optional)
                String postOfficeName = dto.getPostOfficeName();
                if (isNullOrEmpty(postOfficeName)) {
                    warnings.add("Row " + rowNumber + ": Missing POST OFFICE NAME");
                }
                
                // 3. Handle LONGITUDE (optional but validated if present)
                Double longitude = null;
                if (dto.getLongitude() != null) {
                    longitude = validateLongitude(dto.getLongitude(), rowNumber, warnings);
                }
                
                // 4. Handle LATITUDE (optional but validated if present)
                Double latitude = null;
                if (dto.getLatitude() != null) {
                    latitude = validateLatitude(dto.getLatitude(), rowNumber, warnings);
                }
                
                // 5. Handle ZIP CODE (optional)
                String zipCode = dto.getZipCode();
                Barangay barangay = null;
                CityMunicipality cityMun = null;
                Province province = null;
                Regions region = null;
                
                if (!isNullOrEmpty(zipCode)) {
                    // Has zipcode - do the lookup
                    String barangayName = zipToBarangayMap.get(zipCode);
                    if (barangayName != null) {
                        barangay = barangayMap.get(barangayName);
                        
                        if (barangay != null) {
                            // Get the cascade of relationships
                            cityMun = barangay.getCityMunicipality();
                            if (cityMun != null) {
                                province = cityMun.getProvince();
                                if (province != null) {
                                    region = province.getRegion();
                                }
                            }
                        }
                    }
                }
                
                // 6. Handle ADDRESS (optional)
                String address = dto.getAddress();
                
                // 7. Handle CONNECTIVITY STATUS (optional, defaults to false)
                Boolean connectionStatus = convertConnectionStatus(dto.getConnectivityStatus());
                
                // 8. Create PostalOffice entity - ALWAYS CREATE, even if all fields are null
                PostalOffice postalOffice = new PostalOffice();
                postalOffice.setName(postOfficeName);  // Can be null
                postalOffice.setArea(area);  // Can be null
                postalOffice.setAddress(address);  // Can be null
                postalOffice.setRegion(region);  // Can be null
                postalOffice.setProvince(province);  // Can be null
                postalOffice.setCityMunicipality(cityMun);  // Can be null
                postalOffice.setBarangay(barangay);  // Can be null
                postalOffice.setZipCode(zipCode);  // Can be null
                postalOffice.setLongitude(longitude);  // Can be null
                postalOffice.setLatitude(latitude);  // Can be null
                postalOffice.setConnectionStatus(connectionStatus);
                
                postalOfficesToSave.add(postalOffice);
                
            } catch (Exception e) {
                errors.add("Row " + rowNumber + ": Unexpected error - " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        System.out.println("Prepared " + postalOfficesToSave.size() + " records to save");
        System.out.println("Errors: " + errors.size());
        System.out.println("Warnings: " + warnings.size());
        
        // Save all valid records
        if (!postalOfficesToSave.isEmpty()) {
            try {
                System.out.println("Attempting to save " + postalOfficesToSave.size() + " records...");
                List<PostalOffice> saved = postalOfficeRepository.saveAll(postalOfficesToSave);
                System.out.println("Successfully saved " + saved.size() + " records!");
            } catch (Exception e) {
                System.err.println("ERROR SAVING TO DATABASE: " + e.getMessage());
                e.printStackTrace();
                throw new RuntimeException("Failed to save records to database: " + e.getMessage(), e);
            }
        } else {
            System.out.println("WARNING: No records to save!");
        }
        
        // ONLY throw exception if there are actual ERRORS (not warnings)
        if (!errors.isEmpty()) {
            StringBuilder errorMessage = new StringBuilder();
            errorMessage.append("Import failed with ")
                        .append(errors.size())
                        .append(" errors. ")
                        .append(postalOfficesToSave.size())
                        .append(" records were imported successfully.\n\nErrors:\n")
                        .append(String.join("\n", errors.subList(0, Math.min(10, errors.size()))));
            
            if (errors.size() > 10) {
                errorMessage.append("\n... and ").append(errors.size() - 10).append(" more errors");
            }
            
            throw new RuntimeException(errorMessage.toString());
        }
        
        // If only warnings (no errors), just log them
        if (!warnings.isEmpty()) {
            System.out.println("===== IMPORT COMPLETED WITH WARNINGS =====");
            System.out.println(postalOfficesToSave.size() + " records imported successfully");
            System.out.println(warnings.size() + " warnings (check console for details)");
            System.out.println("==========================================");
        } else {
            System.out.println("===== IMPORT COMPLETED SUCCESSFULLY =====");
            System.out.println(postalOfficesToSave.size() + " records imported with no warnings");
            System.out.println("=========================================");
        }
    }
    
    // Helper method to check if string is null or empty
    private boolean isNullOrEmpty(String value) {
        return value == null || value.trim().isEmpty();
    }
    
    private Double validateLatitude(Double latitude, int rowNumber, List<String> warnings) {
        if (latitude == null) {
            return null;
        }
        
        // Latitude must be between -90 and 90
        if (latitude < -90 || latitude > 90) {
            warnings.add("Row " + rowNumber + ": Invalid LATITUDE " + latitude + " (must be between -90 and 90) - setting to null");
            return null;
        }
        
        return latitude;
    }
    
    private Double validateLongitude(Double longitude, int rowNumber, List<String> warnings) {
        if (longitude == null) {
            return null;
        }
        
        // Longitude must be between -180 and 180
        if (longitude < -180 || longitude > 180) {
            warnings.add("Row " + rowNumber + ": Invalid LONGITUDE " + longitude + " (must be between -180 and 180) - setting to null");
            return null;
        }
        
        return longitude;
    }
    
    private Boolean convertConnectionStatus(String status) {
        if (status == null || status.trim().isEmpty()) {
            return false;  // Default to not connected
        }
        // Handle common variations
        status = status.trim().toLowerCase();
        return status.equals("connected") || 
               status.equals("yes") || 
               status.equals("true") || 
               status.equals("1") ||
               status.equals("active");
    }
    
    private Area getArea(String areaFromExcel, Map<String, Area> areaMap) {
        // Convert "AREA-1" to "Area 1"
        String normalized = areaFromExcel.replace("AREA-", "Area ");
        Area area = areaMap.get(normalized);
        if (area == null) {
            throw new RuntimeException("Area not found: " + areaFromExcel);
        }
        return area;
    }
    
    private Map<String, Area> loadAreaMap() {
        List<Area> areas = areaRepository.findAll();
        Map<String, Area> map = new HashMap<>();
        for (Area area : areas) {
            map.put(area.getAreaName(), area);
        }
        return map;
    }
    
    private Map<String, Barangay> loadBarangayMap() {
        List<Barangay> barangays = barangayRepository.findAll();
        Map<String, Barangay> map = new HashMap<>();
        for (Barangay barangay : barangays) {
            map.put(barangay.getName(), barangay);
        }
        return map;
    }
    
    private Map<String, String> loadZipToBarangayMap() {
        List<ZipCode> zipCodes = zipCodeRepository.findAll();
        Map<String, String> map = new HashMap<>();
        for (ZipCode zip : zipCodes) {
            map.put(zip.getZipcode(), zip.getBarangay());
        }
        return map;
    }
    
    private List<PostalOfficeImportDTO> readExcelFile(MultipartFile file) throws IOException {
        List<PostalOfficeImportDTO> data = new ArrayList<>();
        
        Workbook workbook = new XSSFWorkbook(file.getInputStream());
        Sheet sheet = workbook.getSheetAt(0);
        
        // Skip header row, start from row 1
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;
            
            PostalOfficeImportDTO dto = new PostalOfficeImportDTO();
            dto.setArea(getCellValue(row.getCell(0)));                      // AREA
            dto.setPostOfficeName(getCellValue(row.getCell(1)));           // POST OFFICE NAME
            dto.setLongitude(getNumericValue(row.getCell(2)));             // LONGITUDE (column 2)
            dto.setLatitude(getNumericValue(row.getCell(3)));              // LATITUDE (column 3)
            dto.setZipCode(getCellValue(row.getCell(4)));                  // ZIP CODE
            dto.setAddress(getCellValue(row.getCell(5)));                  // ADDRESS LINE1
            dto.setConnectivityStatus(getCellValue(row.getCell(6)));       // CONNECTIVITY STATUS
            
            data.add(dto);
        }
        
        workbook.close();
        return data;
    }
    
    private String getCellValue(Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case STRING:
                String value = cell.getStringCellValue();
                // Return null if empty string
                return (value != null && !value.trim().isEmpty()) ? value : null;
            case NUMERIC:
                return String.valueOf((int) cell.getNumericCellValue());
            case BLANK:
                return null;
            default:
                return null;
        }
    }
    
    private Double getNumericValue(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC) {
            return cell.getNumericCellValue();
        }
        return null;
    }
}