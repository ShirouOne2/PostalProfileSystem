package com.pps.profilesystem.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.pps.profilesystem.Entity.Connectivity;

import java.util.List;

@Repository
public interface ConnectivityRepository extends JpaRepository<Connectivity, Integer> {

    // Find all connectivity records by a specific postal office
    List<Connectivity> findByPostalOfficeId(Integer officeId);

    // Find all connectivity records by provider
    List<Connectivity> findByProviderProviderId(Integer providerId);

    // Find all connectivity records created by a specific user
    // Changed from findByCreatedByUserId to findByCreatedById
    // because User entity has 'id' property, not 'userId'
    List<Connectivity> findByCreatedById(Long userId);

    // Find all wired connections
    List<Connectivity> findByIsWiredTrue();

    // Find all free connections
    List<Connectivity> findByIsFreeTrue();
}