package com.gigforce.assignment.dto;

import com.gigforce.assignment.enums.AssignmentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentResponseDTO {

    private String id;
    private String requisitionId;
    private String requisitionTitle;
    private String contractorProfileId;
    private String contractorName;
    private String contractorEmail;
    private String hiringManagerId;
    private String hiringManagerName;
    private String vendorId;
    private String vendorName;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal agreedRatePerDay;
    private String engagementType;
    private String sowReference;
    private AssignmentStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
