package com.gigforce.identity.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
public class EngagementHistoryRequestDTO {

    @NotBlank(message = "Client name is required")
    @Size(max = 150, message = "Client name must be at most 150 characters")
    private String clientName;

    @NotBlank(message = "Role title is required")
    @Size(max = 150, message = "Role title must be at most 150 characters")
    private String roleTitle;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    private LocalDate endDate; // Optional

    @Size(max = 500, message = "Feedback must be at most 500 characters")
    private String feedback;

    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    private Integer rating;
}
