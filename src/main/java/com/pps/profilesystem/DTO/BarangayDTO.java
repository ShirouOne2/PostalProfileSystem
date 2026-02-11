package com.pps.profilesystem.DTO;

public class BarangayDTO {
    private Integer id;
    private String name;
    
    // Constructors
    public BarangayDTO() {
    }
    
    public BarangayDTO(Integer id, String name) {
        this.id = id;
        this.name = name;
    }
    
    // Getters and Setters
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
}