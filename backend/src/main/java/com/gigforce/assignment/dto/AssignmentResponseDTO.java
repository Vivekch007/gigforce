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
    private String hiringManagerEmail;
    private String orgUnitId;
    private String vendorId;
    private String vendorName;
    private String vendorEmail;
    private String vendorOrgUnitId;
    private String poId;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal agreedRatePerDay;
    private com.gigforce.requisition.enums.EngagementType engagementType;
    private String sowReference;
    private AssignmentStatus status;
    private BigDecimal totalHoursApproved;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
