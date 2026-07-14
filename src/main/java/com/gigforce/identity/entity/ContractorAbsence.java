package com.gigforce.identity.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.enums.AbsenceType;
import com.gigforce.assignment.enums.AbsenceStatus;
import com.gigforce.assignment.enums.AbsenceDuration;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "contractor_absences",
    indexes = {
        @Index(name = "idx_absence_contractor", columnList = "contractor_profile_id"),
        @Index(name = "idx_absence_assignment", columnList = "assignment_id"),
        @Index(name = "idx_absence_status", columnList = "status"),
        @Index(name = "idx_absence_dates", columnList = "start_date, end_date"),
        @Index(name = "idx_absence_org_unit", columnList = "org_unit_id")
    }
)
@org.hibernate.annotations.Check(constraints = "start_date <= end_date")
@AttributeOverride(name = "id", column = @Column(name = "absence_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractorAbsence extends BaseEntity {

    @Column(name = "org_unit_id", length = 64)
    private String orgUnitId;


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contractor_profile_id", nullable = false)
    private ContractorProfile contractorProfile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "absence_type", nullable = false, length = 30)
    private AbsenceType absenceType;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "duration", nullable = false, length = 20)
    private AbsenceDuration duration = AbsenceDuration.FULL_DAY;

    @Column(nullable = false, length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AbsenceStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_id")
    private User approvedBy;

    @Column(name = "approved_date")
    private LocalDateTime approvedDate;

    @Column(name = "rejection_remarks", length = 255)
    private String rejectionRemarks;

    
}
