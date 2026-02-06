package com.pps.profilesystem.Repository;

import com.pps.profilesystem.Entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PostalOfficeRepository extends JpaRepository<PostalOffice, Integer> {
    
    // Find offices by their connection status (True/False)
    List<PostalOffice> findByConnectionStatus(Boolean status);
    
    // Search for an office by name (case-insensitive)
    List<PostalOffice> findByNameContainingIgnoreCase(String name);
    
    // Find all offices within a specific City/Municipality
    List<PostalOffice> findByCityMunicipalityId(Integer cityMunId);

    long countByConnectionStatus(Boolean status);

    @Query("SELECT COUNT(DISTINCT po.area.id) FROM PostalOffice po WHERE po.area IS NOT NULL")
    long countDistinctAreas();
}