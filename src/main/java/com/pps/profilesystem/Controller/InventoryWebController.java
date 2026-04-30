package com.pps.profilesystem.Controller;

import com.pps.profilesystem.DTO.InventoryDTO;
import com.pps.profilesystem.Entity.Barcode;
import com.pps.profilesystem.Entity.Inventory.Category;
import com.pps.profilesystem.Entity.Inventory.IsServiceable;
import com.pps.profilesystem.Service.BarcodeService;
import com.pps.profilesystem.Service.InventoryService;
import com.pps.profilesystem.Service.PropertyTagGenerator;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/inventory")
@RequiredArgsConstructor
public class InventoryWebController {

    private final InventoryService inventoryService;
    private final BarcodeService barcodeService;

    private static final int PAGE_SIZE = 7;

    /* ──────────────────────────────────────────
       GET  /           → redirect to /inventory
       ────────────────────────────────────────── */

    /* ──────────────────────────────────────────
       GET  /inventory   → list page
       ────────────────────────────────────────── */
    @GetMapping({"", "/"})
    public String list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String serviceable,
            @RequestParam(defaultValue = "name")  String sort,
            @RequestParam(defaultValue = "asc")   String dir,
            @RequestParam(defaultValue = "0")      int page,
            Model model) {
        try {
            List<InventoryDTO> all = inventoryService.getAllInventory();

            // ── Filter ──
            List<InventoryDTO> filtered = all.stream()
                    .filter(i -> {
                        if (StringUtils.hasText(q)) {
                            String lq = q.toLowerCase();
                            boolean match = (i.getName() != null && i.getName().toLowerCase().contains(lq))
                                    || (i.getDescription() != null && i.getDescription().toLowerCase().contains(lq))
                                    || (i.getEmployeeId() != null && i.getEmployeeId().toLowerCase().contains(lq))
                                    || (i.getTrackingNumber() != null && i.getTrackingNumber().toLowerCase().contains(lq));
                            if (!match) return false;
                        }
                        if (StringUtils.hasText(category)) {
                            try {
                                Category cat = Category.valueOf(category);
                                if (i.getCategory() != cat) return false;
                            } catch (IllegalArgumentException ignored) {}
                        }
                        if (StringUtils.hasText(serviceable)) {
                            try {
                                IsServiceable svc = IsServiceable.valueOf(serviceable);
                                if (i.getIsServiceable() != svc) return false;
                            } catch (IllegalArgumentException ignored) {}
                        }
                        return true;
                    })
                    .collect(Collectors.toList());

            // ── Sort ──
            Comparator<InventoryDTO> comparator = switch (sort) {
                case "amount"       -> Comparator.comparing(
                        i -> i.getAmount() != null ? i.getAmount() : BigDecimal.ZERO);
                case "dateAcquired" -> Comparator.comparing(
                        i -> i.getDateAcquired() != null ? i.getDateAcquired().toString() : "");
                case "category"     -> Comparator.comparing(
                        i -> i.getCategory() != null ? i.getCategory().name() : "");
                default             -> Comparator.comparing(
                        i -> i.getName() != null ? i.getName() : "");
            };
            if ("desc".equalsIgnoreCase(dir)) comparator = comparator.reversed();
            filtered.sort(comparator);

            // ── Paginate ──
            int totalFiltered = filtered.size();
            int totalPages = Math.max(1, (int) Math.ceil((double) totalFiltered / PAGE_SIZE));
            int safePage = Math.min(page, totalPages - 1);
            int from = safePage * PAGE_SIZE;
            int to   = Math.min(from + PAGE_SIZE, totalFiltered);
            List<InventoryDTO> pageItems = filtered.subList(from, to);

            // ── Stats (always full dataset) ──
            long serviceableCount = all.stream()
                    .filter(i -> i.getIsServiceable() == IsServiceable.yes)
                    .count();
            BigDecimal totalValue = all.stream()
                    .map(i -> i.getAmount() != null ? i.getAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            model.addAttribute("inventoryList",    pageItems);
            model.addAttribute("totalCount",       all.size());
            model.addAttribute("serviceableCount", serviceableCount);
            model.addAttribute("totalValue",       totalValue);
            model.addAttribute("currentPage",      safePage);
            model.addAttribute("totalPages",       totalPages);
            model.addAttribute("activePage",       "inventory");
        } catch (Exception e) {
            model.addAttribute("errorMsg", "Error loading inventory: " + e.getMessage());
        }
        return "inventory";
    }

    /* ──────────────────────────────────────────
       POST /inventory/save   → create/update
       ────────────────────────────────────────── */
    @PostMapping("/inventory/save")
    public String save(@ModelAttribute InventoryDTO dto, RedirectAttributes ra) {
        try {
            if (dto.getInventoryId() != null) {
                inventoryService.updateInventory(dto.getInventoryId(), dto);
                ra.addFlashAttribute("successMsg", "Item updated successfully.");
            } else {
                inventoryService.createInventory(dto);
                ra.addFlashAttribute("successMsg", "Item added successfully.");
            }
        } catch (Exception e) {
            ra.addFlashAttribute("errorMsg", "Error saving item: " + e.getMessage());
        }
        
        if (dto.getPostalOfficeId() != null) {
            return "redirect:/profile/" + dto.getPostalOfficeId() + "?tab=assets";
        }
        return "redirect:/inventory";
    }

    /* ──────────────────────────────────────────
       POST /inventory/{id}/update  → update
       ────────────────────────────────────────── */
    @PostMapping("/inventory/{id}/update")
    public String update(@PathVariable Integer id, @ModelAttribute InventoryDTO dto, RedirectAttributes ra) {
        try {
            inventoryService.updateInventory(id, dto)
                    .ifPresentOrElse(
                            updated -> ra.addFlashAttribute("successMsg", "Item updated successfully."),
                            () -> ra.addFlashAttribute("errorMsg", "Item not found.")
                    );
        } catch (Exception e) {
            ra.addFlashAttribute("errorMsg", "Error updating item: " + e.getMessage());
        }
        return "redirect:/inventory";
    }

    /* ──────────────────────────────────────────
       POST /inventory/{id}/delete  → delete
       ────────────────────────────────────────── */
    @PostMapping("/inventory/{id}/delete")
    public String delete(@PathVariable Integer id, RedirectAttributes ra) {
        try {
            if (inventoryService.deleteInventory(id)) {
                ra.addFlashAttribute("successMsg", "Item deleted successfully.");
            } else {
                ra.addFlashAttribute("errorMsg", "Item not found.");
            }
        } catch (Exception e) {
            ra.addFlashAttribute("errorMsg", "Error deleting item: " + e.getMessage());
        }
        return "redirect:/inventory";
    }

    /* ──────────────────────────────────────────
       GET /test  → simple test endpoint
       ────────────────────────────────────────── */
    @GetMapping("/test")
    @ResponseBody
    public String test() {
        return "Server is running!";
    }

    /* ──────────────────────────────────────────
       GET /print-tag/{id}
       Returns a self-contained HTML page with the property tag.
       The modal JS fetches this URL, parses .tag-wrapper, and shows it inline.
       ────────────────────────────────────────── */
    @GetMapping("/print-tag/{id}")
    public ResponseEntity<String> printTag(@PathVariable Integer id) {
        try {
            // Validate input
            if (id == null) {
                return ResponseEntity.badRequest()
                        .contentType(MediaType.TEXT_HTML)
                        .body("<html><body><p>Error: ID cannot be null</p></body></html>");
            }

            // Try to load real inventory item first
            InventoryDTO item = inventoryService.getInventoryById(id)
                    .orElseGet(() -> buildFallbackItem(id));

            // Validate item
            if (item == null) {
                item = buildFallbackItem(id);
            }

            // Map InventoryDTO → Barcode entity (for PropertyTagGenerator)
            Barcode barcode = inventoryDtoToBarcode(item);
            if (barcode == null) {
                return ResponseEntity.internalServerError()
                        .contentType(MediaType.TEXT_HTML)
                        .body("<html><body><p>Error: Failed to create barcode entity</p></body></html>");
            }

            // Ensure QR content is set
            if (barcode.getQrContent() == null || barcode.getQrContent().isEmpty()) {
                barcode.setQrContent(barcodeService.buildQrContent(barcode));
            }

            // Generate QR code as Base64
            String qrBase64 = null;
            try {
                System.out.println("=== QR Code Generation ===");
                System.out.println("Inventory ID: " + barcode.getInventoryId());
                System.out.println("Tracking Number (RefNum): " + barcode.getRefNum());
                System.out.println("QR Content: " + barcode.getQrContent());
                qrBase64 = barcodeService.generateQrBase64(barcode, 450);
                System.out.println("QR Generated successfully, length: " + (qrBase64 != null ? qrBase64.length() : "null"));
                System.out.println("===========================");
            } catch (Exception qrEx) {
                // QR generation failed, continue without QR
                qrEx.printStackTrace();
                System.err.println("QR Generation Error: " + qrEx.getMessage());
                qrBase64 = "";
            }

            // Generate the full self-contained HTML tag
            String html = PropertyTagGenerator.generate(barcode, qrBase64);
            if (html == null || html.trim().isEmpty()) {
                return ResponseEntity.internalServerError()
                        .contentType(MediaType.TEXT_HTML)
                        .body("<html><body><p>Error: Failed to generate HTML tag</p></body></html>");
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .header("X-Content-Type-Options", "nosniff")
                    .header("Content-Disposition", "inline; filename=\"property-tag.html\"")
                    .body(html);

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .contentType(MediaType.TEXT_HTML)
                    .body("<html><body><p>Error: " + e.getMessage() + "</p></body></html>");
        }
    }

    /* ──────────────────────────────────────────
       GET /inventory/export  → CSV download
       ────────────────────────────────────────── */
    @GetMapping("/inventory/export")
    public void exportCsv(HttpServletResponse response) throws IOException {
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=\"inventory.csv\"");

        List<InventoryDTO> all = inventoryService.getAllInventory();
        try (PrintWriter writer = response.getWriter()) {
            writer.println("ID,Name,Description,Category,Serviceable,Employee ID,Date Acquired,Amount,Created By,Created Stamp");
            for (InventoryDTO i : all) {
                writer.printf("%s,%s,%s,%s,%s,%s,%s,%s,%s,%s%n",
                        safe(i.getInventoryId()),
                        safe(i.getName()),
                        safe(i.getDescription()),
                        i.getCategory() != null ? i.getCategory().name() : "",
                        i.getIsServiceable() != null ? i.getIsServiceable().name() : "",
                        safe(i.getEmployeeId()),
                        safe(i.getDateAcquired()),
                        safe(i.getAmount()),
                        safe(i.getCreatedBy()),
                        safe(i.getCreatedStamp())
                );
            }
        }
    }

    /* ── Helpers ── */

    private Barcode inventoryDtoToBarcode(InventoryDTO item) {
        Barcode barcode = new Barcode();
        barcode.setInventoryId(item.getInventoryId());
        barcode.setRefNum(item.getTrackingNumber() != null ? item.getTrackingNumber() : "INV-" + item.getInventoryId());
        barcode.setDepartment(item.getEmployeeId() != null ? item.getEmployeeId() : "N/A");
        barcode.setDescription(item.getDescription() != null ? item.getDescription() : "N/A");
        barcode.setModelNum(item.getName() != null ? item.getName() : "N/A");
        barcode.setSerialNum(item.getInventoryId() != null ? "INV-" + item.getInventoryId() : "N/A");
        barcode.setItemCost(item.getAmount());
        barcode.setDateObtained(item.getDateAcquired());
        barcode.setAccountableName(item.getEmployeeId() != null ? item.getEmployeeId() : "N/A");
        return barcode;
    }

    private InventoryDTO buildFallbackItem(Integer id) {
        InventoryDTO sample = new InventoryDTO();
        sample.setInventoryId(id);
        sample.setTrackingNumber("TRK-" + id);
        sample.setName("N/A");
        sample.setDescription("N/A");
        sample.setEmployeeId("N/A");
        sample.setDateAcquired(LocalDate.now());
        sample.setAmount(BigDecimal.ZERO);
        return sample;
    }

    private String safe(Object o) {
        return o == null ? "" : o.toString();
    }
}
