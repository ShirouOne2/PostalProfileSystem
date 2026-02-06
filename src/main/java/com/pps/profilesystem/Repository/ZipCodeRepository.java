package com.pps.profilesystem.Repository;

import com.pps.profilesystem.Entity.ZipCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ZipCodeRepository extends JpaRepository<ZipCode, Integer> {
}