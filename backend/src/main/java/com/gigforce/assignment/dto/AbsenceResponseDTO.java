package com.gigforce.assignment.dto;

import com.gigforce.assignment.enums.AbsenceType;
import com.gigforce.assignment.enums.AbsenceStatus;
import com.gigforce.assignment.enums.AbsenceDuration;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AbsenceResponseDTO {
    private String id;
    private String contractorProfileId;
    private String contractorName;
    private String assignmentId;
    private LocalDate startDate;
    private LocalDate endDate;
    private AbsenceType absenceType;
    private AbsenceDuration duration;
    private String reason;
    private AbsenceStatus status;
    private String approvedByUserId;
    private String approvedByName;
    private LocalDateTime approvedDate;
    private String rejectionRemarks;
}
