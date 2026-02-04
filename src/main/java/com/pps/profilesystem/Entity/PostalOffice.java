package com.pps.profilesystem.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "postal_offices")
@Data
public class PostalOffice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;
    private String postmaster;
    
    @Column(columnDefinition = "TEXT")
    private String address;

    @ManyToOne
    @JoinColumn(name = "area_id")
    private Area area;

    @ManyToOne
    @JoinColumn(name = "region_id")
    private Region region;

    @ManyToOne
    @JoinColumn(name = "province_id")
    private Province province;

    @ManyToOne
    @JoinColumn(name = "city_mun_id")
    private CityMunicipality cityMunicipality;

    @ManyToOne
    @JoinColumn(name = "barangay_id")
    private Barangay barangay;

    private String zipCode;
    private Double longitude;
    private Double latitude;
    
    @Column(name = "connection_status")
    private Boolean connectionStatus = false;
}