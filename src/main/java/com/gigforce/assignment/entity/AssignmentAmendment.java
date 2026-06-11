package com.gigforce.assignment.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.identity.entity.User;
import com.gigforce.assignment.enums.AmendmentStatus;
import com.gigforce.assignment.enums.AmendmentType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(
    name = "assignment_amendments",
    indexes = {
        @Index(name = "idx_amend_assign_id", columnList = "assignment_id"),
        @Index(name = "idx_amend_status", columnList = "status")
    }
)
@AttributeOverride(name = "id", column = @Column(name = "assignment_amendment_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentAmendment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @Enumerated(EnumType.STRING)
    @Column(name = "amendment_type", nullable = false, length = 30)
    private AmendmentType amendmentType;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Column(name = "new_value", nullable = false, length = 255)
    private String newValue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_user_id")
    private User approvedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AmendmentStatus status;

    @Column(length = 255)
    private String remarks;

    
}
