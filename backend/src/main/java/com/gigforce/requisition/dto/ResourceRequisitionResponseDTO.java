package com.gigforce.requisition.dto;

import com.gigforce.requisition.enums.RequisitionStatus;
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
public class ResourceRequisitionResponseDTO {
    private String id;
    private String title;
    private String description;
    private String requiredSkillId;
    private String requiredSkillName;
    private Integer minExperienceYears;
    private BigDecimal maxHourlyRate;
    private Integer quantity;
    private RequisitionStatus status;
    private String creatorId;
    private String creatorEmail;
    private String createdOrg;
    private com.gigforce.requisition.enums.EngagementType engagementType;
    private com.gigforce.requisition.enums.ExperienceLevel experienceLevel;
    private java.time.LocalDate startDate;
    private String duration;
    private String businessUnitId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
