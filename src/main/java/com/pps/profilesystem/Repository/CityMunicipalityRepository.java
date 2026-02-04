package com.pps.profilesystem.Repository;

import com.pps.profilesystem.Entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CityMunicipalityRepository extends JpaRepository<CityMunicipality, Integer> {
    List<CityMunicipality> findByProvinceId(Integer provinceId);
}