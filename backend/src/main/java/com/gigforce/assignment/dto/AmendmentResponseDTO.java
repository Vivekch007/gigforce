package com.gigforce.assignment.dto;

import com.gigforce.assignment.enums.AmendmentStatus;
import com.gigforce.assignment.enums.AmendmentType;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AmendmentResponseDTO {

    private String id;
    private String assignmentId;
    private AmendmentType amendmentType;
    private LocalDate effectiveDate;
    private String newValue;
    private String approvedById;
    private String approvedByName;
    private AmendmentStatus status;
    private String remarks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
