package com.pps.profilesystem.Controller;

import com.google.zxing.WriterException;
import com.pps.profilesystem.Entity.Barcode;
import com.pps.profilesystem.Service.BarcodeService;
import com.pps.profilesystem.Service.PropertyTagGenerator;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.io.IOException;

@Controller
@RequiredArgsConstructor
@RequestMapping("/barcodes")
public class BarcodeController {

    private final BarcodeService barcodeService;

    /* ──────────────────────────────────────────
       GET /barcodes  → list all tags
       ────────────────────────────────────────── */
    @GetMapping
    public String list(Model model) {
        model.addAttribute("barcodes", barcodeService.getAll());
        model.addAttribute("activePage", "barcodes");
        return "barcodes/list";
    }

    /* ──────────────────────────────────────────
       POST /barcodes/save  → create / update
       ────────────────────────────────────────── */
    @PostMapping("/save")
    public String save(@ModelAttribute Barcode barcode, RedirectAttributes ra) {
        try {
            barcodeService.save(barcode);
            ra.addFlashAttribute("successMsg", "Property tag saved successfully.");
        } catch (Exception e) {
            ra.addFlashAttribute("errorMsg", "Error saving tag: " + e.getMessage());
        }
        return "redirect:/barcodes";
    }

    /* ──────────────────────────────────────────
       POST /barcodes/{id}/delete
       ────────────────────────────────────────── */
    @PostMapping("/{id}/delete")
    public String delete(@PathVariable Long id, RedirectAttributes ra) {
        if (barcodeService.delete(id)) {
            ra.addFlashAttribute("successMsg", "Tag deleted.");
        } else {
            ra.addFlashAttribute("errorMsg", "Tag not found.");
        }
        return "redirect:/barcodes";
    }

    /* ──────────────────────────────────────────
       GET /barcodes/{id}/qr.png  → raw QR image
       ────────────────────────────────────────── */
    @GetMapping(value = "/{id}/qr.png", produces = MediaType.IMAGE_PNG_VALUE)
    @ResponseBody
    public byte[] qrImage(@PathVariable Long id,
                          @RequestParam(defaultValue = "300") int size,
                          HttpServletResponse response) {
        return barcodeService.getById(id)
                .map(b -> {
                    try {
                        return barcodeService.generateQrPng(b, size);
                    } catch (Exception e) {
                        response.setStatus(500);
                        return new byte[0];
                    }
                })
                .orElseGet(() -> {
                    response.setStatus(404);
                    return new byte[0];
                });
    }

    /* ──────────────────────────────────────────
       GET /barcodes/{id}/print
       Fully generated in Java — no Thymeleaf template needed
       ────────────────────────────────────────── */
    @GetMapping("/{id}/print")
    public ResponseEntity<String> printTag(@PathVariable Long id)
            throws IOException, WriterException {

        if (id == null) {
            throw new IllegalArgumentException("ID cannot be null");
        }

        Barcode barcode = barcodeService.getById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tag not found: " + id));

        String qrBase64 = barcodeService.generateQrBase64(barcode, 250);
        String html = PropertyTagGenerator.generate(barcode, qrBase64);

        MediaType mediaType = MediaType.TEXT_HTML;
        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(html);
    }

    /* ──────────────────────────────────────────
       GET /barcodes/by-inventory/{inventoryId}
       ────────────────────────────────────────── */
    @GetMapping("/by-inventory/{inventoryId}")
    public String byInventory(@PathVariable Integer inventoryId, Model model) {
        model.addAttribute("barcodes", barcodeService.getByInventoryId(inventoryId));
        model.addAttribute("inventoryId", inventoryId);
        model.addAttribute("activePage", "barcodes");
        return "barcodes/list";
    }
}
