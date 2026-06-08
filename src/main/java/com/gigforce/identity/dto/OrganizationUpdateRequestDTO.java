package com.gigforce.identity.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrganizationUpdateRequestDTO {

    @NotBlank(message = "Organization name is required")
    private String name;

    @NotBlank(message = "Organization status is required")
    private String status; // ACTIVE, INACTIVE
}
