package com.pps.profilesystem.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")  // ← DAGDAG ITO
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String username;
    
    @Column(nullable = false)
    private String password;
    
    @Column(name = "role_id")  // ← DAGDAG ITO (kung Integer ang role_id sa DB)
    private Integer role;      // ← BAGUHIN to Integer kung int(11) sa DB
    
    @Column(name = "is_active")  // ← DAGDAG ITO
    private boolean enabled = true;

    @Column(name = "email")  // ← DAGDAG kung meron sa DB
    private String email;
    
    @Column(name = "area_id")  // ← DAGDAG kung meron sa DB
    private Integer areaId;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    
    public Integer getRole() { return role; }
    public void setRole(Integer role) { this.role = role; }
    
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public Integer getAreaId() { return areaId; }
    public void setAreaId(Integer areaId) { this.areaId = areaId; }
}