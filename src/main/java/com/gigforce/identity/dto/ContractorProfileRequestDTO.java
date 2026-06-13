package com.gigforce.identity.dto;

import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.enums.ProfileStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
public class ContractorProfileRequestDTO {

    @NotNull(message = "User ID is required")
    private String userId;

    @NotNull(message = "Hourly rate is required")
    @DecimalMin(value = "0.01", message = "Hourly rate must be greater than 0")
    private java.math.BigDecimal hourlyRate;

    @NotNull(message = "Experience years is required")
    @Min(value = 0, message = "Experience years must be at least 0")
    private Integer experienceYears;

    // Optional fields to update availability/profile status
//    private AvailabilityStatus availabilityStatus; // e.g. AVAILABLE, ON_ASSIGNMENT, ON_STATUS
//    private ProfileStatus status; // profile status: ACTIVE, INACTIVE, BLACKLISTED
    private String availabilityStatus;
    private String status;
}
