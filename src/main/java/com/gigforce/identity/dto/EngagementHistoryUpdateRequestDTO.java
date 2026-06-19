package com.gigforce.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class EngagementHistoryUpdateRequestDTO {

    @NotBlank(message = "Role title is required")
    @Size(max = 150, message = "Role title must be at most 150 characters")
    private String roleTitle;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    private LocalDate endDate; // Optional
}
