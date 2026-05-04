package com.pps.profilesystem.Service;

import com.pps.profilesystem.DTO.InventoryDTO;
import com.pps.profilesystem.Entity.Inventory;
import com.pps.profilesystem.Entity.Inventory.Category;
import com.pps.profilesystem.Entity.Inventory.IsServiceable;
import com.pps.profilesystem.Repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;

    public List<InventoryDTO> getAllInventory() {
        return inventoryRepository.findAll()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public Optional<InventoryDTO> getInventoryById(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("ID cannot be null");
        }
        return inventoryRepository.findById(id).map(this::toDTO);
    }

    public List<InventoryDTO> getByCategory(Category category) {
        return inventoryRepository.findByCategory(category)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryDTO> getByEmployee(String employeeId) {
        return inventoryRepository.findByEmployeeId(employeeId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryDTO> getByPostalOfficeId(Integer postalOfficeId) {
        return inventoryRepository.findByPostalOfficeId(postalOfficeId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryDTO> getByServiceable(IsServiceable isServiceable) {
        return inventoryRepository.findByIsServiceable(isServiceable)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public InventoryDTO createInventory(InventoryDTO dto) {
        Inventory inventory = toEntity(dto);
        return toDTO(inventoryRepository.save(inventory));
    }

    public Optional<InventoryDTO> updateInventory(Integer id, InventoryDTO dto) {
        if (id == null) {
            throw new IllegalArgumentException("ID cannot be null");
        }
        return inventoryRepository.findById(id).map(existing -> {
            existing.setName(dto.getName());
            existing.setDescription(dto.getDescription());
            existing.setDateAcquired(dto.getDateAcquired());
            existing.setEmployeeId(dto.getEmployeeId());
            existing.setPostalOfficeId(dto.getPostalOfficeId());
            existing.setIsServiceable(dto.getIsServiceable());
            existing.setCategory(dto.getCategory());
            existing.setAmount(dto.getAmount());
            return toDTO(inventoryRepository.save(existing));
        });
    }

    public boolean deleteInventory(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("ID cannot be null");
        }
        if (inventoryRepository.existsById(id)) {
            inventoryRepository.deleteById(id);
            return true;
        }
        return false;
    }

    // --- Mappers ---

    private InventoryDTO toDTO(Inventory inv) {
        return InventoryDTO.builder()
                .inventoryId(inv.getInventoryId())
                .trackingNumber(inv.getTrackingNumber())
                .name(inv.getName())
                .description(inv.getDescription())
                .dateAcquired(inv.getDateAcquired())
                .employeeId(inv.getEmployeeId())
                .postalOfficeId(inv.getPostalOfficeId())
                .isServiceable(inv.getIsServiceable())
                .category(inv.getCategory())
                .amount(inv.getAmount())
                .createdStamp(inv.getCreatedStamp())
                .updatedStamp(inv.getUpdatedStamp())
                .createdBy(inv.getCreatedBy())
                .build();
    }

    private Inventory toEntity(InventoryDTO dto) {
        return Inventory.builder()
                .trackingNumber(dto.getTrackingNumber())
                .name(dto.getName())
                .description(dto.getDescription())
                .dateAcquired(dto.getDateAcquired())
                .employeeId(dto.getEmployeeId())
                .postalOfficeId(dto.getPostalOfficeId())
                .isServiceable(dto.getIsServiceable() != null ? dto.getIsServiceable() : IsServiceable.yes)
                .category(dto.getCategory())
                .amount(dto.getAmount())
                .createdBy(dto.getCreatedBy() != null ? dto.getCreatedBy() : "admin")
                .build();
    }
}
