package com.pps.profilesystem.Service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.pps.profilesystem.Entity.PostalOffice;
import com.pps.profilesystem.Repository.PostalOfficeRepository;

@Service
public class LocationService {

    @Autowired
    private PostalOfficeRepository poRepo;

    public List<PostalOffice> getAllOffices() {
        return poRepo.findAll();
    }

    public long countAll() {
        return poRepo.count();
    }

    public long countActive() {
        return poRepo.countByConnectionStatus(true);
    }

    public long countInactive() {
        return poRepo.countByConnectionStatus(false);
    }
    public long countAreas() {
        return poRepo.countDistinctAreas();
    }
}