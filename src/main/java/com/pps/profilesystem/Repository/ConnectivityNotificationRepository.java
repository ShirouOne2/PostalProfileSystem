package com.pps.profilesystem.Repository;

import com.pps.profilesystem.Entity.ConnectivityNotificationEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConnectivityNotificationRepository extends JpaRepository<ConnectivityNotificationEntity, Long> {

    @Query("SELECT n FROM ConnectivityNotificationEntity n ORDER BY n.createdAt DESC")
    List<ConnectivityNotificationEntity> findRecent(Pageable pageable);

    @EntityGraph(attributePaths = "readByEmails")
    @Query("SELECT n FROM ConnectivityNotificationEntity n WHERE n.id = :id")
    Optional<ConnectivityNotificationEntity> findWithReadsById(@Param("id") Long id);
}
