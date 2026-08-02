package com.gigforce.invoice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BatchInvoiceRequestDTO {
    @NotNull(message = "Year is required")
    private Integer year;

    @NotNull(message = "Month is required")
    private Integer month; // 1-12
}
