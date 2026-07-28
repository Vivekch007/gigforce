package com.gigforce.requisition.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorSubmissionRequestDTO {

    @NotNull(message = "Contractor profile ID is required")
    private String contractorProfileId;

    @NotNull(message = "Proposed rate is required")
    @DecimalMin(value = "0.01", message = "Proposed rate must be greater than 0")
    private BigDecimal proposedRate;

    @Size(max = 255, message = "Remarks must not exceed 255 characters")
    private String remarks;
}
