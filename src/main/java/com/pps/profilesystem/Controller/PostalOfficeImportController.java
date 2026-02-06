package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Service.PostalOfficeImportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/postal-offices")
public class PostalOfficeImportController {
    
    @Autowired
    private PostalOfficeImportService importService;
    
    @GetMapping("/import")
    public String showImportPage() {
        return "postal-office-import";
    }
    
    @PostMapping("/import")
    public String importPostalOffices(
            @RequestParam("file") MultipartFile file,
            RedirectAttributes redirectAttributes) {
        
        try {
            // Validate file
            if (file.isEmpty()) {
                redirectAttributes.addFlashAttribute("error", "Please select a file to upload");
                return "redirect:/postal-offices/import";
            }
            
            // Validate file type
            String filename = file.getOriginalFilename();
            if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
                redirectAttributes.addFlashAttribute("error", "Please upload a valid Excel file (.xlsx or .xls)");
                return "redirect:/postal-offices/import";
            }
            
            // Import
            importService.importPostalOffices(file);
            
            redirectAttributes.addFlashAttribute("success", "Postal offices imported successfully!");
            return "redirect:/postal-offices/import";
            
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Import failed: " + e.getMessage());
            return "redirect:/postal-offices/import";
        }
    }
}