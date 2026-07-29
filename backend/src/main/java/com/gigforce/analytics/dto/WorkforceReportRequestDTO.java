package com.gigforce.analytics.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkforceReportRequestDTO {
    @NotBlank(message = "Scope is required")
    private String scope;
}
