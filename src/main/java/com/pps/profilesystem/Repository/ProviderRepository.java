package com.pps.profilesystem.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.pps.profilesystem.Entity.Provider;

@Repository
public interface ProviderRepository extends JpaRepository<Provider, Integer> {

    // Example custom query methods:

    // Find provider by name
    Provider findByName(String name);

    // Check if a provider exists by name
    boolean existsByName(String name);
}

