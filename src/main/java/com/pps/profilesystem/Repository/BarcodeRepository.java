package com.pps.profilesystem.Repository;

import com.pps.profilesystem.Entity.Barcode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BarcodeRepository extends JpaRepository<Barcode, Long> {

    Optional<Barcode> findByRefNum(String refNum);

    List<Barcode> findByDepartment(String department);

    List<Barcode> findByInventoryId(Integer inventoryId);

    Optional<Barcode> findByInventoryIdAndRefNum(Integer inventoryId, String refNum);
}
