package com.gigforce.identity.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.identity.enums.CertificationStatus;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(
    name = "contractor_certifications",
    indexes = {
        @Index(name = "idx_cert_profile_id", columnList = "contractor_profile_id")
    }
)
@AttributeOverride(name = "id", column = @Column(name = "certification_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractorCertification extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contractor_profile_id", nullable = false)
    private ContractorProfile contractorProfile;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "issuing_authority", nullable = false, length = 150)
    private String issuingAuthority;

    @Column(name = "certificate_number", length = 100)
    private String certificateNumber;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "cert_status", length = 20)
    private CertificationStatus certStatus;
}
