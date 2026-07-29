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
public class ContractorProfileStatusUpdateRequestDTO {

    @NotBlank(message = "Status is required")
    private String status; // ACTIVE, INACTIVE, BLACKLISTED
}
