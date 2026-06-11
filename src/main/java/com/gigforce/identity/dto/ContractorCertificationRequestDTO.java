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
public class ContractorCertificationRequestDTO {

    @NotBlank(message = "Certification name is required")
    @Size(max = 150, message = "Certification name must be at most 150 characters")
    private String name;

    @NotBlank(message = "Issuing authority is required")
    @Size(max = 150, message = "Issuing authority must be at most 150 characters")
    private String issuingAuthority;

    @Size(max = 100, message = "Certificate number must be at most 100 characters")
    private String certificateNumber;

    @NotNull(message = "Issue date is required")
    private LocalDate issueDate;

    private LocalDate expiryDate; // Optional
    @Pattern(regexp = "(?i)^(valid|expired|revoked)$", message = "certStatus must be one of: valid, expired, revoked")
    private String certStatus; // optional: valid, expired, revoked
}
