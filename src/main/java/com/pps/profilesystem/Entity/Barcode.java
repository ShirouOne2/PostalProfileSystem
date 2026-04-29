package com.pps.profilesystem.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "barcodes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Barcode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    // Reference number / Property Number (e.g. LV25-01-007-1D)
    @Column(name = "ref_num", length = 100)
    private String refNum;

    @Column(name = "qty")
    private Integer qty;

    @Column(name = "unit", length = 100)
    private String unit;

    // Department / Office Location (e.g. MSD)
    @Column(name = "department", length = 150)
    private String department;

    @Column(name = "serial_num", length = 150)
    private String serialNum;

    @Column(name = "model_num", length = 150)
    private String modelNum;

    // End-User / Person Accountable
    @Column(name = "accountable_name", length = 200)
    private String accountableName;

    @Column(name = "brand", length = 100)
    private String brand;

    // Acquisition Cost (e.g. 54,910.71)
    @Column(name = "item_cost", precision = 15, scale = 2)
    private BigDecimal itemCost;

    // Description of the item (e.g. "Regular Office Table w/ 3-Drawer Mobile Pedestal")
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // Date Acquired / Date Obtained
    @Column(name = "date_obtained")
    private LocalDate dateObtained;

    // QR code content (auto-generated from ref_num)
    @Column(name = "qr_content", columnDefinition = "TEXT")
    private String qrContent;

    // Link to inventory item (optional FK)
    @Column(name = "inventory_id")
    private Integer inventoryId;

    @Column(name = "created_at", updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        // Auto-build QR content from ref_num if not set
        if (this.qrContent == null && this.refNum != null) {
            this.qrContent = buildQrContent();
        }
    }

    private String buildQrContent() {
        return refNum != null ? refNum : "";
    }
}
