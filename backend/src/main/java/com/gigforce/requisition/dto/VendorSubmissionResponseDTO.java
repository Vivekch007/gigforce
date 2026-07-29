package com.gigforce.requisition.dto;

import com.gigforce.requisition.enums.SubmissionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorSubmissionResponseDTO {
    private String id;
    private String requisitionId;
    private String requisitionTitle;
    private String contractorProfileId;
    private String contractorName;
    private String submittedById;
    private String submittedByEmail;
    private SubmissionStatus status;
    private BigDecimal proposedRate;
    private String remarks;
    private java.time.LocalDate submissionDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
