package com.gigforce.requisition.dto;

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
public class ResourceRequisitionRequestDTO {

    @NotBlank(message = "Title is required")
    @Size(min = 3, max = 150, message = "Title must be between 3 and 150 characters")
    private String title;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    @NotNull(message = "Required skill ID is required")
    private String requiredSkillId;

    @NotNull(message = "Minimum experience years is required")
    @Min(value = 0, message = "Minimum experience years must be 0 or greater")
    private Integer minExperienceYears;

    @NotNull(message = "Maximum hourly rate is required")
    @DecimalMin(value = "0.01", message = "Maximum hourly rate must be greater than 0")
    private BigDecimal maxHourlyRate;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;
}
