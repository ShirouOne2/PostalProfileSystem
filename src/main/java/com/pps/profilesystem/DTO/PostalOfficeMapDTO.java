package com.pps.profilesystem.DTO;

import lombok.Data;

@Data
public class PostalOfficeMapDTO {
    private Integer id;
    private String postalOffice;
    private String area;
    private Double latitude;
    private Double longitude;
    private String addressLine;
    private String connectivityStatus;
}
