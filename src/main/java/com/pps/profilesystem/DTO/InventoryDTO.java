package com.pps.profilesystem.DTO;

import com.pps.profilesystem.Entity.Inventory.Category;
import com.pps.profilesystem.Entity.Inventory.IsServiceable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryDTO {
    private Integer inventoryId;
    private String trackingNumber;
    private String name;
    private String description;
    private LocalDate dateAcquired;
    private String employeeId;
    private Integer postalOfficeId;
    private IsServiceable isServiceable;
    private Category category;
    private BigDecimal amount;
    private String createdBy;
    private LocalDateTime createdStamp;
    private LocalDateTime updatedStamp;
}
