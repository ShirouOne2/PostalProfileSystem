package com.pps.profilesystem.Repository;

import com.pps.profilesystem.Entity.Inventory;
import com.pps.profilesystem.Entity.Inventory.Category;
import com.pps.profilesystem.Entity.Inventory.IsServiceable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Integer> {

    List<Inventory> findByCategory(Category category);

    List<Inventory> findByEmployeeId(String employeeId);

    List<Inventory> findByPostalOfficeId(Integer postalOfficeId);

    List<Inventory> findByIsServiceable(IsServiceable isServiceable);
}
