package com.pps.profilesystem.Repository;

import com.pps.profilesystem.Entity.ArchivedOffice;
import com.pps.profilesystem.Entity.PostalOffice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ArchivedOfficeRepository extends JpaRepository<ArchivedOffice, Integer> {

    Optional<ArchivedOffice> findByPostalOffice(PostalOffice postalOffice);

    Optional<ArchivedOffice> findByPostalOfficeId(Integer officeId);

    boolean existsByPostalOfficeId(Integer officeId);

    @Query("SELECT a FROM ArchivedOffice a JOIN FETCH a.postalOffice po LEFT JOIN FETCH po.area")
    List<ArchivedOffice> findAllWithOffice();

    @Query("SELECT a FROM ArchivedOffice a JOIN FETCH a.postalOffice po LEFT JOIN FETCH po.area " +
           "WHERE po.area.id = :areaId")
    List<ArchivedOffice> findAllWithOfficeByArea(@Param("areaId") Integer areaId);

    void deleteByPostalOfficeId(Integer officeId);
}