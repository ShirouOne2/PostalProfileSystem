package com.pps.profilesystem.Entity;

import com.pps.profilesystem.Entity.Inventory.Category;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Converts between Java enum Category and MySQL enum strings
 * that contain spaces ('Office Equipment', 'IT Equipment', 'Vehicle').
 */
@Converter(autoApply = true)
public class CategoryConverter implements AttributeConverter<Category, String> {

    @Override
    public String convertToDatabaseColumn(Category category) {
        if (category == null) return null;
        return switch (category) {
            case OFFICE_EQUIPMENT -> "Office Equipment";
            case IT_EQUIPMENT     -> "IT Equipment";
            case VEHICLE          -> "Vehicle";
        };
    }

    @Override
    public Category convertToEntityAttribute(String dbValue) {
        if (dbValue == null) return null;
        return switch (dbValue) {
            case "Office Equipment" -> Category.OFFICE_EQUIPMENT;
            case "IT Equipment"     -> Category.IT_EQUIPMENT;
            case "Vehicle"          -> Category.VEHICLE;
            default -> throw new IllegalArgumentException("Unknown category: " + dbValue);
        };
    }
}
