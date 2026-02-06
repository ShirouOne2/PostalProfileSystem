package com.pps.profilesystem.Entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "barangays")
@Data
public class Barangay {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String name;

    @ManyToOne
    @JoinColumn(name = "city_mun_id")
    private CityMunicipality cityMunicipality;

    public Integer getId() {
        return id;
    }
    
    public void setId(Integer id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public CityMunicipality getCityMunicipality() {
        return cityMunicipality;
    }
    
    public void setCityMunicipality(CityMunicipality cityMunicipality) {
        this.cityMunicipality = cityMunicipality;
    }

}