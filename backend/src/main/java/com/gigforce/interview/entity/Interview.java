package com.gigforce.interview.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.identity.entity.User;
import com.gigforce.requisition.entity.VendorSubmission;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(
    name = "interviews",
    indexes = {
        @Index(name = "idx_interview_vendor_submission", columnList = "vendor_submission_id"),
        @Index(name = "idx_interview_status", columnList = "status"),
        @Index(name = "idx_interview_scheduled_by", columnList = "scheduled_by_user_id")
    }
)
@AttributeOverride(name = "id", column = @Column(name = "interview_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Interview extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_submission_id", nullable = false)
    private VendorSubmission vendorSubmission;

    @Column(name = "candidate_name", nullable = false, length = 150)
    private String candidateName;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate date;

    @Column(name = "scheduled_time", length = 10)
    private String time;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "SCHEDULED";

    @Column(name = "interview_type", length = 20)
    @Builder.Default
    private String interviewType = "VIDEO";

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scheduled_by_user_id")
    private User scheduledBy;
}
