package com.pps.profilesystem.Entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inventory_id")
    private Integer inventoryId;

    /** Auto-generated tracking number, e.g. TRK-2025-00001 */
    @Column(name = "tracking_number", unique = true, length = 30)
    private String trackingNumber;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "date_acquired")
    private LocalDate dateAcquired;

    @Column(name = "employee_id", length = 50)
    private String employeeId;

    // enum('yes','no') — kept as-is, values match DB strings exactly
    @Enumerated(EnumType.STRING)
    @Column(name = "is_serviceable", nullable = false,
            columnDefinition = "ENUM('yes','no') DEFAULT 'yes'")
    @Builder.Default
    private IsServiceable isServiceable = IsServiceable.yes;

    // CategoryConverter handles mapping between OFFICE_EQUIPMENT <-> "Office Equipment" etc.
    @Convert(converter = CategoryConverter.class)
    @Column(name = "category", nullable = false)
    private Category category;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(name = "postal_office_id")
    private Integer postalOfficeId;

    @Column(name = "created_stamp", nullable = false, updatable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdStamp;

    @Column(name = "updated_stamp", nullable = false,
            columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    private LocalDateTime updatedStamp;

    @Column(name = "created_by", nullable = false, length = 50)
    private String createdBy;

    @PrePersist
    protected void onCreate() {
        this.createdStamp = LocalDateTime.now();
        this.updatedStamp = LocalDateTime.now();
        
        // Auto-generate tracking number if missing
        if (this.trackingNumber == null || this.trackingNumber.trim().isEmpty()) {
            this.trackingNumber = "TRK-" + java.time.Year.now().getValue() + "-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedStamp = LocalDateTime.now();
    }

    public enum IsServiceable {
        yes, no
    }

    public enum Category {
        @JsonProperty("Office Equipment")
        OFFICE_EQUIPMENT,

        @JsonProperty("IT Equipment")
        IT_EQUIPMENT,

        @JsonProperty("Vehicle")
        VEHICLE
    }
}
