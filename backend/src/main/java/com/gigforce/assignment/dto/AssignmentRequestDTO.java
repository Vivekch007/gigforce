package com.gigforce.assignment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentRequestDTO {

    @NotNull(message = "Vendor submission ID is required")
    private String vendorSubmissionId;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotNull(message = "Agreed daily rate is required")
    @DecimalMin(value = "0.01", message = "Agreed daily rate must be greater than 0")
    private BigDecimal agreedRatePerDay;

    @NotNull(message = "Engagement type is required")
    private com.gigforce.requisition.enums.EngagementType engagementType;

    @Size(max = 150, message = "SOW reference must not exceed 150 characters")
    private String sowReference;
}
