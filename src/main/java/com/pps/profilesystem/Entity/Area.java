package com.pps.profilesystem.Entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "area")
@Data
public class Area {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "area_name", nullable = false)
    private String areaName;
}