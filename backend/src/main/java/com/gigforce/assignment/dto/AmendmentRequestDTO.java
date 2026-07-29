package com.gigforce.assignment.dto;

import com.gigforce.assignment.enums.AmendmentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AmendmentRequestDTO {

    @NotNull(message = "Amendment type is required")
    private AmendmentType amendmentType;

    @NotNull(message = "Effective date is required")
    private LocalDate effectiveDate;

    @NotBlank(message = "New value is required")
    @Size(max = 255, message = "New value must not exceed 255 characters")
    private String newValue;

    @Size(max = 255, message = "Remarks must not exceed 255 characters")
    private String remarks;
}
