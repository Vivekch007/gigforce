package com.gigforce.invoice.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class BatchInvoiceResponseDTO {
    private int invoicesGeneratedCount;
    private int totalTimesheetsProcessed;
    private BigDecimal totalAmountBilled;
    private List<String> invoiceIds;
}
