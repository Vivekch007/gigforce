package com.gigforce.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractorCertificationUpdateRequestDTO {

    @NotNull(message = "Issue date is required")
    private LocalDate expiryDate;
    @Pattern(regexp = "(?i)^(valid|expired|revoked)$", message = "certStatus must be one of: valid, expired, revoked")
    private String certStatus; // optional: valid, expired, revoked
}
