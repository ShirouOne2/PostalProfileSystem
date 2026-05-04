package com.pps.profilesystem.Repository;

import com.pps.profilesystem.Entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Collection;
import java.util.List;

@Repository
public interface ProvinceRepository extends JpaRepository<Province, Integer> {
    List<Province> findByRegionsId(Integer regionId);

    /** Used by LocationHierarchyService.getProvincesByArea() */
    List<Province> findByNameInIgnoreCase(Collection<String> names);
}